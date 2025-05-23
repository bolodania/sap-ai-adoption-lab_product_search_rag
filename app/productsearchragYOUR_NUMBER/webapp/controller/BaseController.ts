import Controller from "sap/ui/core/mvc/Controller";
import UIComponent from "sap/ui/core/UIComponent";
import AppComponent from "../Component";
import Model from "sap/ui/model/Model";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import Router from "sap/ui/core/routing/Router";
import History from "sap/ui/core/routing/History";
import Dialog from "sap/m/Dialog";
import MessageBox from "sap/m/MessageBox";
import SelectDialog from "sap/m/SelectDialog";
import Text from "sap/m/Text";
import Button from "sap/m/Button";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Fragment from "sap/ui/core/Fragment";
import { INITIAL_GRAPH } from "../model/graphModel";
import Table from "sap/ui/table/Table";
import Column from "sap/ui/table/Column";
import BusyIndicator from "sap/m/BusyIndicator";
import Popover from "sap/m/Popover";
import ExpandableText from "sap/m/ExpandableText";
import Sorter from "sap/ui/model/Sorter";

/**
 * @namespace productsearchragYOUR_NUMBER.controller
 */
export default abstract class BaseController extends Controller {
	private createGetLinePopover: Popover;
	private resourceBundle: ResourceBundle;
	public controller: AbortController;
	public signal: AbortSignal;
	public productListDialog: SelectDialog;
	public graphObjects: any = {
		naturalPromptDone: {
			"node": {
				"key": "naturalPrompt"
			}
		},
		embeddingDone: {
			"node": {
				"key": "embedPrompt"
			},
			"line": {
				"from": "naturalPrompt",
				"to": "embedPrompt"
			}
		},
		semanticSearchDone: {
			"node": {
				"key": "semanticSearch"
			},
			"line": {
				"from": "embedPrompt",
				"to": "semanticSearch"
			},
			"group": {
				"key": "ragGroup"
			}
		},
		ragDone: {
			"node": {
				"key": "llm"
			},
			"line": {
				"from": "semanticSearch",
				"to": "llm"
			},
			"group": {
				"key": "llmGroup"
			}
		},
		defaultLlmDone: {
			"node": {
				"key": "llm"
			},
			"group": {
				"key": "llmGroup"
			},
		},
		responseDisplayed: {
			"node": {
				"key": "response"
			},
			"line": {
				"from": "llm",
				"to": "response"
			},
		}
	};

	public onInit(): void {
		const model: JSONModel = this.getModel("localModel") as JSONModel;
		this.setModel(model, 'localModel');
	}

	/**
	 * Convenience method for accessing the component of the controller's view.
	 * @returns The component of the controller's view
	 */
	public getOwnerComponent(): AppComponent {
		return super.getOwnerComponent() as AppComponent;
	}

	/**
	 * Convenience method to get the components' router instance.
	 * @returns The router instance
	 */
	public getRouter(): Router {
		return UIComponent.getRouterFor(this);
	}

	/**
	 * Convenience method for getting the i18n resource bundle of the component.
	 * @returns The i18n resource bundle of the component
	 */
	private getResourceBundle(): ResourceBundle {
		const oModel: ResourceModel = this.getOwnerComponent().getModel("i18n") as ResourceModel;
		return oModel.getResourceBundle() as ResourceBundle;
	}

	public getText(sKey: string, aArgs?: any[], bIgnoreKeyFallback?: boolean): string {
		if (!this.resourceBundle) {
			this.resourceBundle = this.getResourceBundle();
		}
		return this.resourceBundle.getText(sKey, aArgs, bIgnoreKeyFallback);
	}

	/**
	 * Convenience method for getting the view model by name in every controller of the application.
	 * @param [sName] The model name
	 * @returns The model instance
	 */
	public getModel(sName?: string): Model {
		return this.getView().getModel(sName);
	}

	/**
	 * Convenience method for setting the view model in every controller of the application.
	 * @param oModel The model instance
	 * @param [sName] The model name
	 * @returns The current base controller instance
	 */
	public setModel(oModel: Model, sName?: string): BaseController {
		this.getView().setModel(oModel, sName);
		return this;
	}

	/**
	 * Convenience method for triggering the navigation to a specific target.
	 * @public
	 * @param sName Target name
	 * @param [oParameters] Navigation parameters
	 * @param [bReplace] Defines if the hash should be replaced (no browser history entry) or set (browser history entry)
	 */
	public navTo(sName: string, oParameters?: object, bReplace?: boolean): void {
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		const route = sName[0].toUpperCase() + sName.slice(1);
		if (route !== "Main") {
			localModel.setProperty("/version", route);
		}
		this.getRouter().navTo(sName, oParameters, undefined, bReplace);
	}

	public async onOpenProductList(event: Event): Promise<void> {
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		if (!this.productListDialog) {
			const version = localModel.getProperty("/version")
			await this.initProductListDialog(version);
		} else {
			// we need to add the table again because on each dialog close, we destroy its content
			// this.productListDialog.addContent(this.createDialogContent());
		}
		// this.createNewGroundingDialog.setModel("TODO");
		let sInputValue = this.byId("productInput").getValue();
		const aProducts = localModel.getProperty("/productsStatic");

		aProducts.forEach(function (oProduct) {
			oProduct.selected = (oProduct.PRODUCT_NAME === sInputValue);
		});
		localModel.setProperty("/productsStatic", aProducts);
		this.productListDialog.open();
		/** Once the grounding has been created and stored, its metadata need to
		 * be added to the model to update the list of available groundings */
	}

	public async onValueHelpDialogClose(event: Event): Promise<void> {
		let oSelectedItem = event.getParameter("selectedItem");
		let oInput = this.byId("productInput");

		const localModel: JSONModel = this.getModel("localModel") as JSONModel;

		if (!oSelectedItem) {
			oInput.resetProperty("value");
			localModel.setProperty("/showProductFiels", false);
			return;
		} else {
			localModel.setProperty("/showProductFiels", true);
		}

		oInput.setValue(oSelectedItem.getTitle());
		this.byId("productDesc").setText(oSelectedItem.getDescription());
	}

	public async initProductListDialog(version: string): Promise<void> {

		this.productListDialog = (await Fragment.load({
			id: "ProductListDialog" + version,
			name: "productsearchragYOUR_NUMBER.view.ProductListDialog",
			controller: this
		})) as SelectDialog;
		const dialog = this.productListDialog as SelectDialog;
		this.getView().addDependent(this.productListDialog);
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		dialog.setModel(localModel);
	}

	public createDialogContent(): Table {
		const pathForTable = "/productsStatic";
		const labelForDescription = "Products";
		const oSorter = new Sorter('PRODUCT_ID');
		const oFirstVisibleRow = 0;
		const table = new Table({
			selectionMode: 'None',
			alternateRowColors: true,
			enableSelectAll: false,
			enableCellFilter: true,
			threshold: 15,
			enableBusyIndicator: true,
			ariaLabelledBy: ["Title"],
			rows: {
				path: pathForTable,
				sorter: oSorter,
			},
			firstVisibleRow: oFirstVisibleRow,
			visibleRowCountMode: "Auto",
			minAutoRowCount: 15,
			noData: new BusyIndicator({})
		});
		// define title column
		const titleColumn = new Column({
			sortProperty: "PRODUCT_ID",
			filterProperty: "PRODUCT_ID",
			autoResizable: true,
			width: "auto"
		});
		titleColumn.setLabel("Title");
		titleColumn.setTemplate(new Text({ text: "{PRODUCT_ID}", wrapping: false }));
		// define releaseDate column
		const releaseDateColumn = new Column({
			sortProperty: "PRODUCT_NAME",
			filterProperty: "PRODUCT_NAME",
			autoResizable: true,
			width: "auto"
		});
		releaseDateColumn.setLabel("Release Date");
		const txt = new Text().bindText({ path: "PRODUCT_NAME" });
		releaseDateColumn.setTemplate(txt);
		// define title column
		const textColumn = new Column({
			filterProperty: "DESCRIPTION",
			autoResizable: true,
			width: "60%"
		});
		textColumn.setLabel(labelForDescription);
		textColumn.setTemplate(new ExpandableText({ text: "{DESCRIPTION}", overflowMode: "Popover" }));
		// add all columns to the table
		table.addColumn(titleColumn);
		table.addColumn(releaseDateColumn);
		table.addColumn(textColumn);

		return table;
	}

	public resetGraph(): void {
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		localModel.setProperty("/applicationFlowGraph", JSON.parse(JSON.stringify(INITIAL_GRAPH)));
		localModel.setProperty("/inputForLLM", "")
		localModel.setProperty("/promptChain", {})
	}

	public updateGraph(graphObjectKeys: any, newStatus: string, duration?: number): void {
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		const graphDefinition: object = localModel.getProperty("/applicationFlowGraph");
		if (graphObjectKeys.node) {
			graphDefinition.nodes.find((node: { key: any; status: string; attributes: any; }) => {
				if (node.key === graphObjectKeys.node.key) {
					node.status = newStatus;
					if (duration) {
						node.attributes[0].value = (Math.round(duration * 100) / 100).toFixed(2) + 's';
					}
				}
			});
		}
		if (graphObjectKeys.line) {
			graphDefinition.lines.find((line: { from: any; to: any; status: string; }) => {
				if (line.from === graphObjectKeys.line.from && line.to === graphObjectKeys.line.to) {
					line.status = newStatus;
				}
			});
		}
		if (graphObjectKeys.group) {
			graphDefinition.groups.forEach((group, index, array) => {
				if (group.key === graphObjectKeys.group.key) {
					group.status = newStatus;
					array[index] = group;
				}
			});
		}
		localModel.setProperty("/applicationFlowGraph", graphDefinition);
	}

	public async onCancelPress(event: Event): Promise<void> {
		this.controller.abort();
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		await localModel.setProperty("/standard/llmAnswer", "");
		console.log("request aborted");
		this.resetGraph();
	}

	public toggleLLMNodeBusy(isBusy: boolean) {
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		let nodesDefinition = localModel.getProperty('/applicationFlowGraph/nodes');
		nodesDefinition.find((g: { key: string; busy: boolean; }) => {
			if (g.key === 'llm') g.busy = isBusy
		});
		localModel.setProperty('/applicationFlowGraph/nodes', nodesDefinition);
	}

	public toggleRagGroupBusy(isBusy: boolean) {
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		let groupsDefinition = localModel.getProperty('/applicationFlowGraph/groups');
		groupsDefinition.find((g: { key: string; busy: boolean; }) => {
			if (g.key === 'ragGroup') g.busy = isBusy
		});
		localModel.setProperty('/applicationFlowGraph/groups', groupsDefinition);
	}

	public async connectToGenAI(endpoint: string, payload: any) {
		this.controller = new AbortController();
		this.signal = this.controller.signal;
		const oDataModel = this.getModel() as ODataModel;
		let oActionODataContextBinding = oDataModel.bindContext(endpoint);
		oActionODataContextBinding.setParameter("query", payload.text);
		oActionODataContextBinding.setParameter("chatModelName", payload.model);
		oActionODataContextBinding.setParameter("sdkName", payload.sdk);
		oActionODataContextBinding.setParameter("withRAG", payload.withRAG);

		var that = this;

		let response = "";
		await oActionODataContextBinding.execute().then(
			function () {
				var oActionContext = oActionODataContextBinding.getBoundContext();
				console.log(oActionContext.getObject().value);
				response = oActionContext.getObject().value;
			},
			function (oError) {
				MessageBox.alert(oError.message, {
					icon: MessageBox.Icon.ERROR,
					title: "Error"
				});

			}
				.bind(this)
		);

		return response;
	}

	public greyOutGraphObject(graphObject: any, isWithRag: boolean, propertyToCheck: string, green?: boolean): any {
		if (green) {
			if (graphObject[propertyToCheck] && graphObject[propertyToCheck] === "ragGroup") {
				graphObject.status = "Success"
			}
		} else {
			if (isWithRag) {
				if (graphObject[propertyToCheck] && graphObject[propertyToCheck] === "ragGroup") {
					graphObject.status = "CustomStandard"
				}
			} else {
				if (graphObject[propertyToCheck] && graphObject[propertyToCheck] === "ragGroup") {
					graphObject.status = "CustomInactive"
				}
			}
		}

		return graphObject;
	}

	public setRagGroupColor(isWithRag: boolean, green?: boolean): void {
		const localModel: JSONModel = this.getModel("localModel") as JSONModel;
		const graphDefinition: object = localModel.getProperty("/applicationFlowGraph");
		const colorAdjustedNodes = graphDefinition.nodes.map((node: any) => this.greyOutGraphObject(node, isWithRag, "group", green));
		const colorAdjustedLines = graphDefinition.lines.map((line: any) => this.greyOutGraphObject(line, isWithRag, "group", green));
		const colorAdjustedGroups = graphDefinition.groups.map((group: any) => this.greyOutGraphObject(group, isWithRag, "key", green));
		graphDefinition.nodes = colorAdjustedNodes;
		graphDefinition.lines = colorAdjustedLines;
		graphDefinition.groups = colorAdjustedGroups;
		localModel.setProperty("/applicationFlowGraph", graphDefinition);
	}
}
