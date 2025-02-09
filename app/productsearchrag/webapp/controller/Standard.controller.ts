import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Event from "sap/ui/base/Event";

export default class Standard extends BaseController {
    public onInit(): void {
        super.onInit();
    }

    public async onPromptLlmWithRagSubmit(event: Event): Promise<void> {
        this.resetGraph();

        this.controller = new AbortController();
        this.signal = this.controller.signal;
        const localModel: JSONModel = this.getModel("suggestedQuestions") as JSONModel;

        const question: string = localModel.getProperty("/standard/llmWithRagPrompt");

        // as long as the request is running, set the response text field to busy
        await localModel.setProperty("/standard/ragAnswerListItemIsBusy", true);
        await localModel.setProperty("/standard/ragAnswerPanelIsExpanded", true);
        await localModel.setProperty("/standard/llmWithRagPrompt", question);
        const withRag: Boolean = localModel.getProperty("/standard/withRag");
        const modelName = localModel.getProperty("/scenario/standard/selectedModel");
        const modelValue = localModel
            .getProperty("/models")
            .find((m: { name: string; description: string; "icon": string; "value": string }) => m.name === modelName)
            .value
        this.updateGraph(this.graphObjects.naturalPromptDone, "Success");
        const endpointFullRAg = "/connectToGenAI(...)";
        try {
            if (!withRag) {
                this.toggleLLMNodeBusy(true);
                this.toggleLLMNodeBusy(true);
                const payload = { "text": question, "model": modelValue, "withRAG": withRag };
                const response = await this.connectToGenAI(endpointFullRAg, payload);
                const llmResults = response.content.replaceAll("<", "< ");
                const llmDuration = response.duration;
                localModel.setProperty("/standard/llmAnswer", llmResults);
                this.updateGraph(this.graphObjects.defaultLlmDone, "Success", llmDuration);
            } else {
                this.toggleRagGroupBusy(true);
                // // Step 1
                const payload = { "text": question, "model": modelValue, "withRAG": withRag };
                const response = await this.connectToGenAI(endpointFullRAg, payload);
                this.updateGraph(this.graphObjects.embeddingDone, "Success", response.duration);
                // // // Step 2
                this.updateGraph(this.graphObjects.semanticSearchDone, "Success", response.duration);
                // // Step 3
                localModel.setProperty("/standard/llmAnswer", response.content.replaceAll("<", "< "));
                this.updateGraph(this.graphObjects.ragDone, "Success", response.duration);
            }
            await this.updateGraph(this.graphObjects.responseDisplayed, "Success");
        } catch (error) {
            console.log(error);
            if (error.message === endpointFullRAg) {
                this.updateGraph(this.graphObjects.defaultLlmDone, "Error");
            } else {
                    this.updateGraph(this.graphObjects.embeddingDone, "Error");
                    this.updateGraph(this.graphObjects.semanticSearchDone, "Error");
                    this.updateGraph(this.graphObjects.ragDone, "Error");
            }
            await this.updateGraph(this.graphObjects.responseDisplayed, "Error");
            // TODO: update Graph with "error" status in case we reach this code
        } finally {
            await localModel.setProperty("/standard/ragAnswerListItemIsBusy", false);
            this.toggleRagGroupBusy(false);
            this.toggleLLMNodeBusy(false);
            console.log("DONE");
        }
    }

    public async onFindAlternativePress(): Promise<void> {
        const localModel: JSONModel = this.getModel("suggestedQuestions") as JSONModel;

        const llmWithRagPrompt = "Suggest an alternative for a product name '" + this.byId("productInput").getValue() + "' with the description '" + this.byId("productDesc").getText() + "'";
        console.log(llmWithRagPrompt);

        localModel.setProperty("/standard/llmWithRagPrompt", llmWithRagPrompt);
    }

    public async onStandardPromptDeletePress(event: Event): Promise<void> {
        const selectedItem = event.getParameter("listItem").getId()
        const selectedItemIndex = +selectedItem.split("-").at(-1)
        const localModel: JSONModel = this.getModel("suggestedQuestions") as JSONModel;
        const existingQuestions = localModel.getProperty("/scenario/prompts");
        existingQuestions.splice(selectedItemIndex, 1)
        existingQuestions.map((q: { index: number; }) => { if (q.index > selectedItemIndex) q.index -= 1 })
        localModel.setProperty("/scenario/prompts", existingQuestions);
    }

    public onWithRagToggle(event: Event): void {
        // depending on switch state, grey out the "with RAG" part of the graph, or the "without RAG" part
        this.resetGraph();
        const localModel: JSONModel = this.getModel("suggestedQuestions") as JSONModel;
        const isWithRag: boolean = localModel.getProperty("/standard/withRag");
        this.setRagGroupColor(isWithRag);

    }
}
