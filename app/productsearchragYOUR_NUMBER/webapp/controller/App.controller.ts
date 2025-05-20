import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import { CAPMODEL } from "../model/cap";

/**
 * @namespace productsearchragYOUR_NUMBER.controller
 */
export default class App extends BaseController {

    public onInit(): void {
        // apply content density mode to root view
        this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
        this.navToMain();
    }

    public navToMain(): void {
        const localModel: JSONModel = this.getModel("localModel") as JSONModel;
        localModel.setProperty("/version", "")
        localModel.setProperty("/scenario/promptChain", "");
        this.navTo("standard");
    }
}
