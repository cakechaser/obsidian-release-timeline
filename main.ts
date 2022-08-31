import { App, Editor, MarkdownPostProcessorContext, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { getAPI, isPluginEnabled, DataviewAPI } from "obsidian-dataview";
import HelpFunctions from "functions";
import { ReleaseTimelineSettings, DEFAULT_SETTINGS, SampleSettingTab } from "settings";

export default class ReleaseTimeline extends Plugin {
	settings: ReleaseTimelineSettings;
	
	HelpFunctions = new HelpFunctions(this);
	
	async onload() {
		
		this.app.workspace.onLayoutReady( () => {
			const isDataviewInstalled = !!getAPI();
			if (!isDataviewInstalled) {
  				new Notice("The Release Timeline plugin requires Dataview to properly function.");
			}
		});

		await this.loadSettings();

		console.log("loading obsidian-release-timeline");
		
		this.addSettingTab(new SampleSettingTab(this.app, this));
	    
		this.registerMarkdownCodeBlockProcessor('release-timeline', async (content: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {

			let timelineTable = await this.HelpFunctions.renderTimeline(content);

			//render
			el.appendChild(timelineTable);

			let bulletOption = this.settings.bulletPoints;

			let matches = el.querySelectorAll(".td-first, .td-next");
        	matches.forEach(function(match) {
				match.classList.toggle('bullet-points', bulletOption);
        	});

		});

		this.registerMarkdownCodeBlockProcessor('release-timeline-month', async (content: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {

			let timelineTable = await this.HelpFunctions.renderTimelineMonth(content);

			//render
			el.appendChild(timelineTable);

			let bulletOption = this.settings.bulletPoints;

			let matches = el.querySelectorAll(".td-first, .td-next");
        	matches.forEach(function(match) {
				match.classList.toggle('bullet-points', bulletOption);
        	});

		})

	}
	

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}