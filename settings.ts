import { App, Editor, MarkdownPostProcessorContext, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, SearchMatches, Setting } from 'obsidian';
import ReleaseTimeline from "./main";

export interface ReleaseTimelineSettings {
	defaultSortOrder: string;
	collapseEmptyYears: boolean;
    bulletPoints: boolean;
	collapseLimit: string;
	collapseEmptyMonthsWeeklyTimeline: boolean;
	weekDisplayFormat: string;
}

export const DEFAULT_SETTINGS: ReleaseTimelineSettings = {
	defaultSortOrder: 'desc',
	collapseEmptyYears: false,
    bulletPoints: true,
	collapseLimit: '2',
	collapseEmptyMonthsWeeklyTimeline: true,
	weekDisplayFormat: 'dateNames'
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: ReleaseTimeline;

	constructor(app: App, plugin: ReleaseTimeline) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h3', {text: 'Common settings'});

		new Setting(containerEl)
			.setName('Default sort order')
			.setDesc('Used if sort order is not provided in a query')
			.addDropdown( (dropdown) => {
				dropdown.addOption("asc", "Ascending");
				dropdown.addOption("desc", "Descending");
				dropdown.setValue(this.plugin.settings.defaultSortOrder);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultSortOrder = value;
					await this.plugin.saveSettings();
				});
			});

			new Setting(containerEl)
            .setName('Bullet points')
            .setDesc('Improves readability for time periods with multiple entries')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.bulletPoints);
                toggle.onChange(async (value) => {
                    this.plugin.settings.bulletPoints = value;
                    await this.plugin.saveSettings();
                    this.updateCSS();
                });
            });

		containerEl.createEl('h3', {text: 'Year timeline settings'});

		new Setting(containerEl)
			.setName('Collapse empty years')
			.setDesc('Consecutive empty years will be collapsed into one range (2000-2018)')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyYears);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyYears = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Minimum number of years to be collapsed')
			.addText(text => text.setPlaceholder('2')
				.setValue(this.plugin.settings.collapseLimit)
				.onChange(async (value) => {
					this.plugin.settings.collapseLimit = value;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl('h3', {text: 'Week timeline settings'});

		new Setting(containerEl)
			.setName('Collapse empty months')
			.setDesc('Weeks will not be displayed for months without actual data')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyMonthsWeeklyTimeline);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyMonthsWeeklyTimeline = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Week formatting')
			.addDropdown( (dropdown) => {
				dropdown.addOption("weekNames", 'Week names: "W15"');
				dropdown.addOption("dateNames", 'Date names: "11-17"');
				dropdown.setValue(this.plugin.settings.weekDisplayFormat);
				dropdown.onChange(async (value) => {
					this.plugin.settings.weekDisplayFormat = value;
					await this.plugin.saveSettings();
				});
			});
	}

    updateCSS() {
        let bulletOption = this.plugin.settings.bulletPoints;
        let matches = document.querySelectorAll(".td-first, .td-next");
        matches.forEach(function(match) {
            match.classList.toggle('bullet-points', bulletOption);
        });
  
    }

}