import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import { CAPMODEL } from "../model/cap";

/**
 * @namespace productsearchrag.controller
 */
export default class App extends BaseController {

    public onInit(): void {
        // apply content density mode to root view
        this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
        this.navToMain();
    }

    public navToMain(): void {
        const localModel: JSONModel = this.getModel("suggestedQuestions") as JSONModel;
        localModel.setProperty("/scenario", JSON.parse(JSON.stringify(CAPMODEL)));
        localModel.setProperty("/version", "")
        localModel.setProperty("/scenario/promptChain", "");
        this.navTo("standard");
    }
}
