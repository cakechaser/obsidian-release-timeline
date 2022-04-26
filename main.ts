import { App, Editor, MarkdownPostProcessorContext, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { getAPI, isPluginEnabled, DataviewAPI } from "obsidian-dataview";
import HelpFunctions from "functions";
import { MyPluginSettings, DEFAULT_SETTINGS, SampleSettingTab } from "settings";
// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	
	HelpFunctions = new HelpFunctions(this);
	
	async onload() {
		
		await this.loadSettings();

		console.log("loading timeline-test");
		
		//let testEnabled = isPluginEnabled(this.app);
		
		this.addSettingTab(new SampleSettingTab(this.app, this));
	    
		this.registerMarkdownCodeBlockProcessor('timeline-test', async (content: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
			
			//get results from
			//let results = getDataviewResults(content, dv);

			let timelineTable = this.HelpFunctions.renderTimeline(content);

			//render
			el.appendChild(timelineTable);

			let bulletOption = this.settings.bulletPoints;

			let matches = document.querySelectorAll(".td-first, .td-next");
        	matches.forEach(function(match) {
				match.classList.toggle('bullet-points', bulletOption);
        	});

		});

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

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

