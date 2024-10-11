sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */

    async function (Controller, JSONModel, MessageBox) {
        "use strict";

        return Controller.extend("productsearchrag.controller.Main", {
            onInit: function () {

                const responseModel = new JSONModel({});
                this.getView().setModel(responseModel, "responseModel");

                const intValModel = new JSONModel({
                    outputLimit: 5,
                    enableRAG: false
                });
                this.getView().setModel(intValModel, "intValModel");
                
            },

            _onSubmit: function () {

                // const withRAG = this.byId("enableRagSwitch").getState();

                // if (withRAG) {
                //     this.byId("llmExplanationColumn").setVisible(true);
                // } else {
                //     this.byId("llmExplanationColumn").setVisible(false);
                // }

                var oModel = this.getView().getModel();
                var oActionODataContextBinding = oModel.bindContext("/connectToGenAI(...)");
                oActionODataContextBinding.setParameter("prompt", this.byId("promptInput").getValue());
                oActionODataContextBinding.setParameter("limit", "5");
                oActionODataContextBinding.setParameter("withRAG", false);

                const localModel = this.getView().getModel("responseModel");
                var oGlobalBusyDialog = new sap.m.BusyDialog();
                oGlobalBusyDialog.open();

                var that = this;

                oActionODataContextBinding.execute().then(
                    function () {
                        var oActionContext = oActionODataContextBinding.getBoundContext();
                        console.log(oActionContext.getObject().value.Response);
                        localModel.setData(oActionContext.getObject().value.Response);
                        oGlobalBusyDialog.close();
                        that.byId("table0").setVisible(true);
                        that.byId("im").setVisible(false);
                    },
                    function (oError) {
                        oGlobalBusyDialog.close();
                        that.byId("table0").setVisible(false);
                        that.byId("im").setVisible(true);
                        MessageBox.alert(oError.message, {
                            icon: MessageBox.Icon.ERROR,
                            title: "Error"
                        });

                    }
                        .bind(this)
                );

            }
        });
    });