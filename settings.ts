import { App, Editor, MarkdownPostProcessorContext, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, SearchMatches, Setting } from 'obsidian';
import ReleaseTimeline from "./main";

export interface ReleaseTimelineSettings {
	defaultSortOrder: string;
	collapseEmptyYears: boolean;
    bulletPoints: boolean;
	collapseLimit: string
}

export const DEFAULT_SETTINGS: ReleaseTimelineSettings = {
	defaultSortOrder: 'desc',
	collapseEmptyYears: false,
    bulletPoints: true,
	collapseLimit: '2'
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

		containerEl.createEl('h2', {text: 'Timeline settings'});

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
			.setName('Collapse empty years')
			.setDesc('Consecutive empty years will be collapsed into one range like 2000-2018')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.collapseEmptyYears);
				toggle.onChange(async (value) => {
					this.plugin.settings.collapseEmptyYears = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Collapse empty years limit')
			.setDesc('Minimum number of years present in a block for it to be collapsed')
			.addText(text => text.setPlaceholder('2')
				.setValue(this.plugin.settings.collapseLimit)
				.onChange(async (value) => {
					this.plugin.settings.collapseLimit = value;
					await this.plugin.saveSettings();
				})
			);

        new Setting(containerEl)
            .setName('Bullet points')
            .setDesc('Enable bullet points for years with multiple items')
            .addToggle((toggle) => {
                toggle.setValue(this.plugin.settings.bulletPoints);
                toggle.onChange(async (value) => {
                    this.plugin.settings.bulletPoints = value;
                    await this.plugin.saveSettings();
                    this.updateCSS();
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
