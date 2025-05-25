// types.ts (It's good practice to define types in a separate file if they are used across multiple files)
export interface CarbonTrackerStats {
    totalTokens: number;
    carbonEmissions: number;
    userTokens: number;
    assistantTokens: number;
    userMessageCount: number;
    sessionStartTime: number;
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
    WATTS_PER_TOKEN: 0.003,
    CARBON_INTENSITY: 0.475,
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
    CARBON_STATS: 'carbon_tracker_stats'
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

    constructor() {
        // Check if we're on ChatGPT domain
        

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

        if (!this.isChatGPTDomain()) {
            console.log('Not on ChatGPT domain, carbon tracker will not initialize');
            return;
        }

        this.loadStatsFromStorage().then(() => {
            this.createUI();
            this.initWhenReady().then(() => {
                this.isInitialized = true;
                console.log('Carbon Tracker initialized successfully');
            });
        });
    }

    private isChatGPTDomain(): boolean {
        return window.location.href.includes('chat.openai.com') || 
               window.location.href.includes('chatgpt.com') || window.location.href.includes('chat.openai.com');
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
                console.log('Loaded stats from storage:', stats);
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
            console.log('Stats saved to storage:', stats);
        } catch (error) {
            console.error('Error saving stats to storage:', error);
        }
    }

    private async resetStats(): Promise<void> {
        this.userMessageCount = 0;
        this.userTokens = 0;
        this.assistantTokens = 0;
        this.totalTokens = 0;
        this.carbonEmissions = 0;
        this.sessionStartTime = Date.now();
        
        await this.saveStatsToStorage();
        this.updateUI();
        console.log('Stats reset successfully');
    }

    private async initWhenReady(): Promise<void> {
        const attemptInit = (): void => {
            const chatContainer = this.findChatContainer();
            if (chatContainer) {
                console.log('Chat container found, setting up observer');
                this.setupConversationObserver(chatContainer);
                this.analyzeConversation();
            } else {
                console.log('Chat container not found, retrying...');
                setTimeout(attemptInit, 1000);
            }
        };
        attemptInit();
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
        const observer = new MutationObserver(this.debounceAnalyzeConversation.bind(this));
        observer.observe(chatContainer, {
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

    private createUI(): void {
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'carbon-tracker-container';
        this.uiContainer.style.cssText = `
            position: fixed; bottom: 32px; right: 32px;
            background: rgb(255, 255, 255);
            backdrop-filter: blur(12px) saturate(1.3);
            border-radius: 18px;
            border: 1.5px solid rgba(16,163,127,0.18);
            box-shadow: 0 8px 32px 0 rgba(16,163,127,0.18), 0 1.5px 8px 0 rgba(0,0,0,0.08);
            padding: 0;
            width: 320px;
            font-family: 'Segoe UI', 'Inter', system-ui, sans-serif;
            font-size: 15px;
            color: #222;
            z-index: 10000;
            transition: box-shadow 0.2s;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex; align-items: center; justify-content: space-between;
            padding: 18px 22px 10px 22px; border-bottom: 1px solid #e0f2ef;
            background: transparent; font-weight: 600; font-size: 17px; color: #10a37f;
        `;

        const title = document.createElement('div');
        title.innerHTML = `<span style="font-size: 1.5em; vertical-align: middle;">🌱</span> <span style="vertical-align: middle;">Carbon Tracker</span>`;

        // Toggle button
        const toggleButton = document.createElement('button');
        toggleButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M5 8l5 5 5-5" stroke="#10a37f" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
        toggleButton.style.cssText = `
            background: none; border: none; cursor: pointer; margin-left: 8px;
            padding: 2px; border-radius: 4px; transition: background 0.15s;
            display: flex; align-items: center; justify-content: center;
        `;
        toggleButton.onmouseover = () => toggleButton.style.background = "#e0f2ef";
        toggleButton.onmouseout = () => toggleButton.style.background = "none";

        // Reset button
        const resetButton = document.createElement('button');
        resetButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 20 20"><path d="M10 2v2a6 6 0 1 1-6 6" stroke="#10a37f" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M2 4l4-2v4z" fill="#10a37f"/></svg>';
        resetButton.title = 'Reset stats';
        resetButton.style.cssText = `
            background: none; border: none; cursor: pointer; margin-left: 8px;
            padding: 2px; border-radius: 4px; transition: background 0.15s;
            display: flex; align-items: center; justify-content: center;
        `;
        resetButton.onmouseover = () => resetButton.style.background = "#e0f2ef";
        resetButton.onmouseout = () => resetButton.style.background = "none";
        resetButton.addEventListener('click', () => this.resetStats());

        this.contentArea = document.createElement('div');
        this.contentArea.id = 'carbon-tracker-content';
        this.contentArea.style.cssText = `
            padding: 18px 22px 18px 22px;
            background: transparent;
            border-radius: 0 0 18px 18px;
            transition: max-height 0.2s;
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
        buttonContainer.style.display = 'flex';
        buttonContainer.appendChild(toggleButton);
        buttonContainer.appendChild(resetButton);
        header.appendChild(buttonContainer);

        this.uiContainer.appendChild(header);
        this.uiContainer.appendChild(this.contentArea);
        document.body.appendChild(this.uiContainer);

        this.updateUI();
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

// Initialize the tracker when the document is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    new ImprovedCarbonTracker();
} else {
    window.addEventListener('DOMContentLoaded', () => new ImprovedCarbonTracker());
}