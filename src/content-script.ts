// types.ts (It's good practice to define types in a separate file if they are used across multiple files)
export interface CarbonTrackerStats {
    totalTokens: number;
    carbonEmissions: number;
    userTokens: number;
    assistantTokens: number;
    userMessageCount: number;
    sessionStartTime: number;
}

export interface GlobalCarbonStats {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCarbonEmissions: number;
    lastUpdated: number;
}

export interface ChatGPTTimePeriodStats {
    carbonEmissions: number;
    inputTokens: number;
    outputTokens: number;
    lastUpdated: number;
}

export interface CarbonStatsByPeriod {
    daily: ChatGPTTimePeriodStats;
    weekly: ChatGPTTimePeriodStats;
    monthly: ChatGPTTimePeriodStats;
}

// Storage utility function
export function setStorage<V = any>(key: string, value: V): Promise<boolean> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(true);
            }
        });
    });
}

// content.ts
interface CarbonConstants {
    WATTS_PER_TOKEN: number;
    CARBON_INTENSITY: number;
    SECONDS_PER_TOKEN: number;
    CHARS_PER_TOKEN: number;
    IGNORED_KEYWORDS: string[];
    ASSISTANT_SELECTORS: string[];
    EXCLUDE_PATTERNS: RegExp[];
}

const CARBON_CONSTANTS: CarbonConstants = {
    WATTS_PER_TOKEN: 0.0045,
    CARBON_INTENSITY: 0.59,
    SECONDS_PER_TOKEN: 0.05,
    CHARS_PER_TOKEN: 4,

    // Expanded list of ignored keywords and patterns
    IGNORED_KEYWORDS: [
        'settings',
        'chatgpt',
        'upgrade',
        'help',
        'feedback',
        'new chat',
        'regenerate',
        'clear conversations',
        'welcome back',
        'how can i help you today?',
        'loading',
        'thinking',
        'plugin store'
    ],

    // Improved selectors for assistant messages
    ASSISTANT_SELECTORS: [
        'div[data-testid="conversation-turn-response"]',
        'div[class*="assistant-message"]',
        'div[class*="response"]',
        'div[class*="message-container"]',
        'div[data-message-author="assistant"]',
        '.group .whitespace-pre-wrap'
    ],

    // Patterns to exclude from message content
    EXCLUDE_PATTERNS: [
        /\[.*?\]/g,
        /\(.*?\)/g,
        /^\s*[•\-]\s*/gm
    ]
};

// Storage keys
const STORAGE_KEYS = {
    CARBON_STATS: 'carbon_tracker_stats',
    GLOBAL_STATS: 'carbon_tracker_global_stats',
    DAILY_STATS: 'carbon_tracker_daily_stats',
    WEEKLY_STATS: 'carbon_tracker_weekly_stats',
    MONTHLY_STATS: 'carbon_tracker_monthly_stats'
};

class ImprovedCarbonTracker {
    private userMessageCount: number;
    private userTokens: number;
    private assistantTokens: number;
    private totalTokens: number;
    private carbonEmissions: number;
    private sessionStartTime: number;

    private uiContainer: HTMLDivElement | null;
    private contentArea: HTMLDivElement | null;
    private isAnalyzing: boolean;
    private isInitialized: boolean;
    private initAttempts: number;
    private maxInitAttempts: number;
    private observer: MutationObserver | null;
    
    // Track last saved values to calculate incremental changes
    private lastSavedUserTokens: number | undefined;
    private lastSavedAssistantTokens: number | undefined;
    private lastSavedCarbonEmissions: number | undefined;

    constructor() {
        this.userMessageCount = 0;
        this.userTokens = 0;
        this.assistantTokens = 0;
        this.totalTokens = 0;
        this.carbonEmissions = 0;
        this.sessionStartTime = Date.now();

        this.uiContainer = null;
        this.contentArea = null;
        this.isAnalyzing = false;
        this.isInitialized = false;
        this.initAttempts = 0;
        this.maxInitAttempts = 20;
        this.observer = null;
        
        // Initialize tracking variables
        this.lastSavedUserTokens = undefined;
        this.lastSavedAssistantTokens = undefined;
        this.lastSavedCarbonEmissions = undefined;

        if (!this.isChatGPTDomain()) {
            console.log('Not on ChatGPT domain, carbon tracker will not initialize');
            return;
        }

        // Wait for page to be fully loaded before initializing
        this.waitForPageReady().then(() => {
            this.initialize();
        });
    }

    isChatGPTDomain(): boolean {
        return window.location.href.includes('chat.openai.com') || 
               window.location.href.includes('chatgpt.com');
    }

    private async waitForPageReady(): Promise<void> {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                // Add extra delay to ensure ChatGPT's dynamic content is ready
                setTimeout(resolve, 2000);
            } else {
                window.addEventListener('load', () => {
                    setTimeout(resolve, 2000);
                });
            }
        });
    }

    private async initialize(): Promise<void> {
        try {
            await this.loadStatsFromStorage();
            await this.createUIWhenReady();
            await this.initWhenReady();
            this.isInitialized = true;
            console.log('Carbon Tracker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Carbon Tracker:', error);
        }
    }

    private async createUIWhenReady(): Promise<void> {
        return new Promise((resolve, reject) => {
            const attemptCreateUI = () => {
                this.initAttempts++;
                
                // Check if UI already exists
                if (document.getElementById('carbon-tracker-container')) {
                    console.log('UI already exists');
                    resolve();
                    return;
                }

                try {
                    this.createUI();
                    if (this.uiContainer && document.body.contains(this.uiContainer)) {
                        console.log('UI created successfully');
                        resolve();
                    } else {
                        throw new Error('UI creation failed');
                    }
                } catch (error) {
                    if (this.initAttempts >= this.maxInitAttempts) {
                        reject(new Error(`Failed to create UI after ${this.maxInitAttempts} attempts`));
                        return;
                    }
                    console.log(`UI creation attempt ${this.initAttempts} failed, retrying...`);
                    setTimeout(attemptCreateUI, 1000);
                }
            };
            
            attemptCreateUI();
        });
    }

    private async loadStatsFromStorage(): Promise<void> {
    try {
        const result = await new Promise<{ [key: string]: any }>((resolve) => {
            chrome.storage.local.get([STORAGE_KEYS.CARBON_STATS], resolve);
        });

        if (result[STORAGE_KEYS.CARBON_STATS]) {
            const stats: CarbonTrackerStats = result[STORAGE_KEYS.CARBON_STATS];
            this.userMessageCount = stats.userMessageCount || 0;
            this.userTokens = stats.userTokens || 0;
            this.assistantTokens = stats.assistantTokens || 0;
            this.totalTokens = stats.totalTokens || 0;
            this.carbonEmissions = stats.carbonEmissions || 0;
            this.sessionStartTime = stats.sessionStartTime || Date.now();

            // Initialize tracking variables with current values
            // This ensures we don't lose track when reloading the extension
            this.lastSavedUserTokens = this.userTokens;
            this.lastSavedAssistantTokens = this.assistantTokens;
            this.lastSavedCarbonEmissions = this.carbonEmissions;
            
            console.log('Loaded stats from storage:', stats);
            console.log('Initialized tracking variables:', {
                lastSavedUserTokens: this.lastSavedUserTokens,
                lastSavedAssistantTokens: this.lastSavedAssistantTokens,
                lastSavedCarbonEmissions: this.lastSavedCarbonEmissions
            });
        } else {
            // Initialize tracking variables as undefined for first run
            this.lastSavedUserTokens = undefined;
            this.lastSavedAssistantTokens = undefined;
            this.lastSavedCarbonEmissions = undefined;
            console.log('No existing stats found, starting fresh');
        }
    } catch (error) {
        console.error('Error loading stats from storage:', error);
    }
}

    private async saveStatsToStorage(): Promise<void> {
        try {
            const stats: CarbonTrackerStats = {
                totalTokens: this.totalTokens,
                carbonEmissions: this.carbonEmissions,
                userTokens: this.userTokens,
                assistantTokens: this.assistantTokens,
                userMessageCount: this.userMessageCount,
                sessionStartTime: this.sessionStartTime
            };

            await setStorage(STORAGE_KEYS.CARBON_STATS, stats);
            
            
            await this.updateTimePeriodStats();
            await this.updateGlobalStats();
            
            console.log('Stats saved to storage:', stats);
        } catch (error) {
            console.error('Error saving stats to storage:', error);
        }
    }

   private async updateGlobalStats(): Promise<void> {
    console.log('Updating global stats...');
    try {
        const result = await new Promise<{ [key: string]: any }>((resolve) => {
            chrome.storage.local.get([STORAGE_KEYS.GLOBAL_STATS], resolve);
        });

        const existingGlobalStats: GlobalCarbonStats = result[STORAGE_KEYS.GLOBAL_STATS] || {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCarbonEmissions: 0,
            lastUpdated: Date.now()
        };

        let updatedGlobalStats: GlobalCarbonStats;

        // First time saving or when tracking variables are undefined
        if (this.lastSavedUserTokens === undefined || 
            this.lastSavedAssistantTokens === undefined || 
            this.lastSavedCarbonEmissions === undefined) {
            
            // Add all current session values to global stats
            updatedGlobalStats = {
                totalInputTokens: existingGlobalStats.totalInputTokens + this.userTokens,
                totalOutputTokens: existingGlobalStats.totalOutputTokens + this.assistantTokens,
                totalCarbonEmissions: existingGlobalStats.totalCarbonEmissions + this.carbonEmissions,
                lastUpdated: Date.now()
            };
            
            console.log('First save - adding full session values to global stats');
        } else {
            // Calculate only the difference from last save to avoid double counting
            const userTokensDiff = this.userTokens - this.lastSavedUserTokens;
            const assistantTokensDiff = this.assistantTokens - this.lastSavedAssistantTokens;
            const carbonEmissionsDiff = this.carbonEmissions - this.lastSavedCarbonEmissions;

            if( userTokensDiff >= 0 || assistantTokensDiff >= 0 || carbonEmissionsDiff >= 0) {
                updatedGlobalStats = {
                    totalInputTokens: existingGlobalStats.totalInputTokens + userTokensDiff,
                    totalOutputTokens: existingGlobalStats.totalOutputTokens + assistantTokensDiff,
                    totalCarbonEmissions: existingGlobalStats.totalCarbonEmissions + carbonEmissionsDiff,
                    lastUpdated: Date.now()
                };
            }
            else {
                // If no changes, keep existing global stats
                updatedGlobalStats = existingGlobalStats;
            }

            console.log(`Incremental save - adding diffs: user=${userTokensDiff}, assistant=${assistantTokensDiff}, carbon=${carbonEmissionsDiff}`);
        }

        await setStorage(STORAGE_KEYS.GLOBAL_STATS, updatedGlobalStats);
        
        // Update tracking variables after successful save
        this.lastSavedUserTokens = this.userTokens;
        this.lastSavedAssistantTokens = this.assistantTokens;
        this.lastSavedCarbonEmissions = this.carbonEmissions;

        console.log('Global stats updated:', updatedGlobalStats);
    } catch (error) {
        console.error('Error updating global stats:', error);
    }
}

    private async updateTimePeriodStats(): Promise<void> {
        const now = Date.now();
        const today = new Date(now).toDateString();
        const thisWeek = this.getWeekKey(now);
        const thisMonth = this.getMonthKey(now);

        // Calculate incremental changes
        console.log('the usertoken diff', this.lastSavedUserTokens, this.userTokens);
        const userTokensDiff = this.lastSavedUserTokens !== undefined ? 
            this.userTokens - this.lastSavedUserTokens : this.userTokens;
        console.log('the assistant token diff', this.lastSavedAssistantTokens, this.assistantTokens);
        const assistantTokensDiff = this.lastSavedAssistantTokens !== undefined ? 
            this.assistantTokens - this.lastSavedAssistantTokens : this.assistantTokens;
        console.log('the carbon emissions diff', this.lastSavedCarbonEmissions, this.carbonEmissions);
        const carbonEmissionsDiff = this.lastSavedCarbonEmissions !== undefined ? 
            this.carbonEmissions - this.lastSavedCarbonEmissions : this.carbonEmissions;

        console.log(`Updating time period stats for today=${today}, week=${thisWeek}, month=${thisMonth}`);
        console.log(`User tokens diff: ${userTokensDiff}, Assistant tokens diff: ${assistantTokensDiff}, Carbon emissions diff: ${carbonEmissionsDiff}`);

        await Promise.all([
            this.updateDailyStats(today, userTokensDiff, assistantTokensDiff, carbonEmissionsDiff),
            this.updateWeeklyStats(thisWeek, userTokensDiff, assistantTokensDiff, carbonEmissionsDiff),
            this.updateMonthlyStats(thisMonth, userTokensDiff, assistantTokensDiff, carbonEmissionsDiff)
        ]);
    }

    private async updateDailyStats(dateKey: string, userTokens: number, assistantTokens: number, carbonEmissions: number): Promise<void> {
        try {
            const result = await new Promise<{ [key: string]: any }>((resolve) => {
                chrome.storage.local.get([STORAGE_KEYS.DAILY_STATS], resolve);
            });

            const dailyStats = result[STORAGE_KEYS.DAILY_STATS] || {};
            
            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = {
                    carbonEmissions: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    lastUpdated: Date.now()
                };
            }

            dailyStats[dateKey].carbonEmissions += carbonEmissions;
            dailyStats[dateKey].inputTokens += userTokens;
            dailyStats[dateKey].outputTokens += assistantTokens;
            dailyStats[dateKey].lastUpdated = Date.now();

            await setStorage(STORAGE_KEYS.DAILY_STATS, dailyStats);
            console.log('Daily stats updated for', dateKey, dailyStats[dateKey]);
        } catch (error) {
            console.error('Error updating daily stats:', error);
        }
    }

    private async updateWeeklyStats(weekKey: string, userTokens: number, assistantTokens: number, carbonEmissions: number): Promise<void> {
        try {
            const result = await new Promise<{ [key: string]: any }>((resolve) => {
                chrome.storage.local.get([STORAGE_KEYS.WEEKLY_STATS], resolve);
            });

            const weeklyStats = result[STORAGE_KEYS.WEEKLY_STATS] || {};
            
            if (!weeklyStats[weekKey]) {
                weeklyStats[weekKey] = {
                    carbonEmissions: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    lastUpdated: Date.now()
                };
            }

            weeklyStats[weekKey].carbonEmissions += carbonEmissions;
            weeklyStats[weekKey].inputTokens += userTokens;
            weeklyStats[weekKey].outputTokens += assistantTokens;
            weeklyStats[weekKey].lastUpdated = Date.now();

            await setStorage(STORAGE_KEYS.WEEKLY_STATS, weeklyStats);
            console.log('Weekly stats updated for', weekKey, weeklyStats[weekKey]);
        } catch (error) {
            console.error('Error updating weekly stats:', error);
        }
    }

    private async updateMonthlyStats(monthKey: string, userTokens: number, assistantTokens: number, carbonEmissions: number): Promise<void> {
        try {
            const result = await new Promise<{ [key: string]: any }>((resolve) => {
                chrome.storage.local.get([STORAGE_KEYS.MONTHLY_STATS], resolve);
            });

            const monthlyStats = result[STORAGE_KEYS.MONTHLY_STATS] || {};
            
            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    carbonEmissions: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    lastUpdated: Date.now()
                };
            }

            monthlyStats[monthKey].carbonEmissions += carbonEmissions;
            monthlyStats[monthKey].inputTokens += userTokens;
            monthlyStats[monthKey].outputTokens += assistantTokens;
            monthlyStats[monthKey].lastUpdated = Date.now();

            await setStorage(STORAGE_KEYS.MONTHLY_STATS, monthlyStats);
            console.log('Monthly stats updated for', monthKey, monthlyStats[monthKey]);
        } catch (error) {
            console.error('Error updating monthly stats:', error);
        }
    }

    private getWeekKey(timestamp: number): string {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (timestamp - firstDayOfYear.getTime()) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    }

    private getMonthKey(timestamp: number): string {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    }

    private async resetStats(): Promise<void> {
    // Save current values to global stats before resetting (if they exist)
    if (this.userTokens > 0 || this.assistantTokens > 0 || this.carbonEmissions > 0) {
        await this.saveStatsToStorage(); // This will update global stats with current session
    }
    
    // Reset session stats
    this.userMessageCount = 0;
    this.userTokens = 0;
    this.assistantTokens = 0;
    this.totalTokens = 0;
    this.carbonEmissions = 0;
    this.sessionStartTime = Date.now();
    
    // Reset tracking variables to current (zero) values
    this.lastSavedUserTokens = 0;
    this.lastSavedAssistantTokens = 0;
    this.lastSavedCarbonEmissions = 0;
    
    // Save the reset session stats (but don't affect global stats since we set tracking vars to 0)
    const stats: CarbonTrackerStats = {
        totalTokens: this.totalTokens,
        carbonEmissions: this.carbonEmissions,
        userTokens: this.userTokens,
        assistantTokens: this.assistantTokens,
        userMessageCount: this.userMessageCount,
        sessionStartTime: this.sessionStartTime
    };

    await setStorage(STORAGE_KEYS.CARBON_STATS, stats);
    
    this.updateUI();
    console.log('Stats reset successfully');
}

    private async initWhenReady(): Promise<void> {
        return new Promise((resolve) => {
            const attemptInit = () => {
                const chatContainer = this.findChatContainer();
                if (chatContainer) {
                    console.log('Chat container found, setting up observer');
                    this.setupConversationObserver(chatContainer);
                    this.analyzeConversation();
                    resolve();
                } else {
                    console.log('Chat container not found, retrying...');
                    setTimeout(attemptInit, 1000);
                }
            };
            attemptInit();
        });
    }

    private findChatContainer(): HTMLElement | null {
        const selectors: string[] = [
            '#__next > div',
            'main',
            '[data-testid="conversation-container"]',
            '.conversation-container',
            'div[class*="chat"]',
            'div[class*="conversation"]'
        ];

        for (const selector of selectors) {
            const container = document.querySelector<HTMLElement>(selector);
            if (container) return container;
        }
        return null;
    }

    private setupConversationObserver(chatContainer: HTMLElement): void {
        // Clean up existing observer
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver(this.debounceAnalyzeConversation.bind(this));
        this.observer.observe(chatContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });
        console.log('MutationObserver set up successfully');
    }

    private debounceAnalyzeConversation(): void {
        if (this.isAnalyzing || !this.isInitialized) {
            return;
        }
        this.isAnalyzing = true;
        setTimeout(async () => {
            try {
                await this.analyzeConversation();
            } catch (error) {
                console.error('Error during conversation analysis:', error);
            } finally {
                this.isAnalyzing = false;
            }
        }, 1000);
    }

    private async analyzeConversation(): Promise<void> {
        const userMessages: HTMLElement[] = this.selectUserMessages();
        const assistantMessages: HTMLElement[] = this.selectAssistantMessages();

        this.userMessageCount = userMessages.length;
        this.userTokens = 0;
        this.assistantTokens = 0;

        userMessages.forEach((message, index) => {
            const text = this.extractCleanText(message);
            if (!this.isIgnoredMessage(text)) {
                const tokens = this.estimateTokens(text);
                this.userTokens += tokens;
                console.log(`User message ${index + 1}: tokens = ${tokens}`);
            }
        });

        assistantMessages.forEach((message, index) => {
            const text = this.extractCleanText(message);
            if (!this.isIgnoredMessage(text)) {
                const tokens = this.estimateTokens(text);
                this.assistantTokens += tokens;
                console.log(`Assistant message ${index + 1}: tokens = ${tokens}`);
            }
        });

        this.totalTokens = this.userTokens + this.assistantTokens;
        this.calculateCarbonEmissions();
        await this.saveStatsToStorage();
        this.updateUI();
    }

    private selectUserMessages(): HTMLElement[] {
        const userSelectors: string[] = [
            'div[class*="user"]',
            'div[class*="message"][data-message-author="user"]',
            'div[data-testid="conversation-turn-user"]'
        ];

        for (const selector of userSelectors) {
            const messages = document.querySelectorAll<HTMLElement>(selector);
            if (messages.length > 0) return Array.from(messages);
        }
        return [];
    }

    private selectAssistantMessages(): HTMLElement[] {
        for (const selector of CARBON_CONSTANTS.ASSISTANT_SELECTORS) {
            const messages = document.querySelectorAll<HTMLElement>(selector);

            if (messages.length > 0) {
                const validMessages = Array.from(messages)
                    .filter(this.isValidAssistantMessage.bind(this))
                    .filter(message => {
                        const text = this.extractCleanText(message);
                        return text.length > 10 && !this.isIgnoredMessage(text);
                    });

                if (validMessages.length > 0) {
                    console.log(`Found ${validMessages.length} valid assistant messages using selector: ${selector}`);
                    return validMessages;
                }
            }
        }

        console.log('Falling back to aggressive assistant message selection');
        return this.fallbackAssistantMessageSelection();
    }

    private isValidAssistantMessage(messageElement: HTMLElement): boolean {
        return messageElement.tagName === 'DIV' && (messageElement.innerText || messageElement.textContent || '').trim().length > 0;
    }

    private fallbackAssistantMessageSelection(): HTMLElement[] {
        const potentialSelectors: string[] = [
            'div:not([class*="user"]) > div.whitespace-pre-wrap',
            'div:not([class*="user"]) > p',
        ];

        for (const selector of potentialSelectors) {
            const messages = document.querySelectorAll<HTMLElement>(selector);

            if (messages.length > 0) {
                const validMessages = Array.from(messages)
                    .filter(message => {
                        const text = this.extractCleanText(message);
                        return (
                            text.length > 10 &&
                            !this.isIgnoredMessage(text) &&
                            !text.toLowerCase().includes('user')
                        );
                    });

                if (validMessages.length > 0) {
                    console.log(`Fallback: Found ${validMessages.length} messages using selector: ${selector}`);
                    return validMessages;
                }
            }
        }
        return [];
    }

    private isIgnoredMessage(text: string): boolean {
        const lowercaseText = text.toLowerCase();

        const hasIgnoredKeyword = CARBON_CONSTANTS.IGNORED_KEYWORDS.some(keyword =>
            lowercaseText.includes(keyword)
        );

        const isShortOrEmpty = text.length <= 10;
        const isSystemMessage = lowercaseText.includes('chatgpt') ||
            lowercaseText.includes('welcome') ||
            lowercaseText.includes('help') ||
            lowercaseText.includes('how can i help you today') ||
            lowercaseText.includes('new chat') ||
            lowercaseText.includes('model: gpt');

        return hasIgnoredKeyword || isShortOrEmpty || isSystemMessage;
    }

    private extractCleanText(messageElement: HTMLElement): string {
        let text = messageElement.innerText || messageElement.textContent || '';

        CARBON_CONSTANTS.EXCLUDE_PATTERNS.forEach(pattern => {
            text = text.replace(pattern, '');
        });

        return text.trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s.,!?]/g, '')
            .toLowerCase();
    }

    private estimateTokens(text: string): number {
        const wordCount = text.split(/\s+/).length;
        const charCount = text.length;

        return Math.max(1, Math.ceil(
            (0.6 * (charCount / CARBON_CONSTANTS.CHARS_PER_TOKEN)) +
            (0.4 * wordCount)
        ));
    }

    private calculateCarbonEmissions(): void {
        const energyUsageWh = (
            this.totalTokens *
            CARBON_CONSTANTS.WATTS_PER_TOKEN
        );

        this.carbonEmissions = energyUsageWh * CARBON_CONSTANTS.CARBON_INTENSITY;

        console.log(
            'Calculated emissions:',
            this.carbonEmissions.toFixed(6),
            'g CO₂e for',
            this.totalTokens,
            'tokens'
        );
    }

    private generateEquivalents(): { activity: string; amount: string; unit: string; }[] {
        return [
            {
                activity: "Google queries",
                amount: (this.carbonEmissions / 0.2).toFixed(3),
                unit: "Number (annually)"
            },
            {
                activity: "Boiling ",
                amount: (this.carbonEmissions / 15).toFixed(3),
                unit: "cups water in kettle (annually)"
            },
            {
                activity: "Video Streaming ",
                amount: (this.carbonEmissions / 55).toFixed(3),
                unit: "Hours (annually)"
            },
        ];
    }

    createUI(): void {
        // Check if UI already exists and remove it
        const existingUI = document.getElementById('carbon-tracker-container');
        if (existingUI) {
            existingUI.remove();
        }

        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'carbon-tracker-container';
        this.uiContainer.style.cssText = `
            position: fixed !important; 
            bottom: 32px !important; 
            right: 32px !important;
            background: rgb(255, 255, 255) !important;
            backdrop-filter: blur(12px) saturate(1.3) !important;
            border-radius: 18px !important;
            border: 1.5px solid rgba(16,163,127,0.18) !important;
            box-shadow: 0 8px 32px 0 rgba(16,163,127,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.08) !important;
            padding: 0 !important;
            width: 320px !important;
            font-family: 'Segoe UI', 'Inter', system-ui, sans-serif !important;
            font-size: 15px !important;
            color: #222 !important;
            z-index: 10000 !important;
            transition: box-shadow 0.2s !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex !important; 
            align-items: center !important; 
            justify-content: space-between !important;
            padding: 18px 22px 10px 22px !important; 
            border-bottom: 1px solid #e0f2ef !important;
            background: transparent !important; 
            font-weight: 600 !important; 
            font-size: 17px !important; 
            color: #10a37f !important;
        `;

        const title = document.createElement('div');
        title.innerHTML = `<span style="font-size: 1.5em; vertical-align: middle;">🌱</span> <span style="vertical-align: middle;">Carbon Tracker</span>`;

        // Toggle button
        const toggleButton = document.createElement('button');
        toggleButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M5 8l5 5 5-5" stroke="#10a37f" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
        toggleButton.style.cssText = `
            background: none !important; 
            border: none !important; 
            cursor: pointer !important; 
            margin-left: 8px !important;
            padding: 2px !important; 
            border-radius: 4px !important; 
            transition: background 0.15s !important;
            display: flex !important; 
            align-items: center !important; 
            justify-content: center !important;
        `;
        toggleButton.onmouseover = () => toggleButton.style.background = "#e0f2ef";
        toggleButton.onmouseout = () => toggleButton.style.background = "none";

        // Reset button
        const resetButton = document.createElement('button');
        resetButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M10 2v2a6 6 0 1 1-6 6" stroke="#10a37f" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M2 4l4-2v4z" fill="#10a37f"/></svg>';
        resetButton.title = 'Reset stats';
        resetButton.style.cssText = `
            background: none !important; 
            border: none !important; 
            cursor: pointer !important; 
            margin-left: 8px !important;
            padding: 2px !important; 
            border-radius: 4px !important; 
            transition: background 0.15s !important;
            display: flex !important; 
            align-items: center !important; 
            justify-content: center !important;
        `;
        resetButton.onmouseover = () => resetButton.style.background = "#e0f2ef";
        resetButton.onmouseout = () => resetButton.style.background = "none";
        resetButton.addEventListener('click', () => this.resetStats());

        this.contentArea = document.createElement('div');
        this.contentArea.id = 'carbon-tracker-content';
        this.contentArea.style.cssText = `
            padding: 18px 22px 18px 22px !important;
            background: transparent !important;
            border-radius: 0 0 18px 18px !important;
            transition: max-height 0.2s !important;
            display: block !important;
        `;

        let isCollapsed = false;
        toggleButton.addEventListener('click', () => {
            if (this.contentArea) {
                this.contentArea.style.display = isCollapsed ? 'block' : 'none';
                toggleButton.innerHTML = isCollapsed
                    ? '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M5 8l5 5 5-5" stroke="#10a37f" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
                    : '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M5 12l5-5 5 5" stroke="#10a37f" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
                isCollapsed = !isCollapsed;
            }
        });

        header.appendChild(title);
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex !important;';
        buttonContainer.appendChild(toggleButton);
        buttonContainer.appendChild(resetButton);
        header.appendChild(buttonContainer);

        this.uiContainer.appendChild(header);
        this.uiContainer.appendChild(this.contentArea);
        
        // Make sure the UI is appended properly and persists
        document.body.appendChild(this.uiContainer);
        
        // Force a layout recalculation
        this.uiContainer.offsetHeight;

        this.updateUI();

        // Set up a watcher to ensure UI doesn't get removed
        this.setupUIProtection();
    }

    private setupUIProtection(): void {
        // Periodically check if UI still exists and recreate if needed
        setInterval(() => {
            if (this.uiContainer && !document.body.contains(this.uiContainer)) {
                console.log('UI was removed, recreating...');
                this.createUI();
            }
        }, 5000);

        // Watch for DOM changes that might remove our UI
        const bodyObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node === this.uiContainer) {
                            console.log('UI was removed by DOM change, recreating...');
                            setTimeout(() => this.createUI(), 100);
                        }
                    });
                }
            });
        });

        bodyObserver.observe(document.body, {
            childList: true,
            subtree: false
        });
    }

    private updateUI(): void {
        if (!this.contentArea) return;
        const equivalents = this.generateEquivalents();
        const sessionDurationMinutes = Math.round((Date.now() - this.sessionStartTime) / 60000);

        // Progress bar for carbon emissions (max 100g for visual, can be adjusted)
        const maxEmission = 100;
        const percent = Math.min(100, (this.carbonEmissions / maxEmission) * 100);

        this.contentArea.innerHTML = `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color:#10a37f; font-weight:600;">Total tokens</span>
                    <span style="font-variant-numeric: tabular-nums;">${this.totalTokens.toLocaleString()}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span>User tokens</span>
                    <span>${this.userTokens.toLocaleString()}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span>Assistant tokens</span>
                    <span>${this.assistantTokens.toLocaleString()}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span>User messages</span>
                    <span>${this.userMessageCount}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span>Session</span>
                    <span>${sessionDurationMinutes} min</span>
                </div>
            </div>
            <div style="margin-bottom: 18px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color:#10a37f; font-weight:600;">Carbon emissions</span>
                    <span style="font-variant-numeric: tabular-nums;">
                        <span style="font-weight:600;">${this.carbonEmissions.toFixed(3)}</span>
                        <span style="color:#888;">g CO₂e</span>
                    </span>
                </div>
                <div style="width: 100%; height: 10px; background: #e0f2ef; border-radius: 6px; overflow: hidden; margin-bottom: 2px;">
                    <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, #10a37f 60%, #b2f7e2 100%); border-radius: 6px; transition: width 0.3s;"></div>
                </div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="font-weight: 500; margin-bottom: 7px; color: #10a37f; font-size: 15px;">🌍 Equivalent to:</div>
                ${equivalents.map(eq => `
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; font-size: 13.5px;">
                        <span style="color:#555;">${eq.activity}</span>
                        <span style="color:#10a37f; font-weight:600;">${eq.amount}</span>
                        <span style="color:#888;">${eq.unit}</span>
                    </div>
                `).join('')}
            </div>
            <div style="text-align:center; font-size:12px; color:#aaa; margin-top: 8px;">
                <span>Made with <span style="color:#10a37f;">&#10084;</span> for a greener web</span>
            </div>
        `;
    }

    private showError(message: string): void {
        if (this.contentArea) {
            this.contentArea.innerHTML = `<div style="color: #d32f2f;">${message}</div>`;
        }
    }
}

// Global instance to prevent multiple initializations
let trackerInstance: ImprovedCarbonTracker | null = null;

// Initialize the tracker when the document is ready
function initializeTracker() {
    if (trackerInstance) {
        console.log('Tracker already initialized');
        return;
    }
    
    console.log('Initializing Carbon Tracker...');
    trackerInstance = new ImprovedCarbonTracker();
}

// Multiple initialization strategies to ensure it works
if (document.readyState === 'complete') {
    setTimeout(initializeTracker, 1000);
} else if (document.readyState === 'interactive') {
    setTimeout(initializeTracker, 2000);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeTracker, 2000);
    });
    window.addEventListener('load', () => {
        setTimeout(initializeTracker, 3000);
    });
}

// Handle navigation changes in SPA
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        console.log('URL changed, reinitializing tracker...');
        setTimeout(() => {
            if (trackerInstance && trackerInstance.isChatGPTDomain()) {
                // Don't create new instance, just reinitialize UI if needed
                const existingUI = document.getElementById('carbon-tracker-container');
                if (!existingUI) {
                    trackerInstance.createUI();
                }
            }
        }, 3000);
    }
}).observe(document, { subtree: true, childList: true });