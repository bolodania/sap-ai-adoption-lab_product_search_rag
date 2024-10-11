sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    function (Controller) {
        "use strict";

        return Controller.extend("productsearchrag.controller.App", {
            onInit: function () {
                // apply content density mode to root view
                this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
            },

            navToMain() {
                const localModel = this.getModel("suggestedQuestions")
                localModel.setProperty("/scenario", {})
                localModel.setProperty("/version", "")
                localModel.setProperty("/scenario/promptChain", "")
                this.navTo("main")
            },

            onNavToScenarioPress(event) {
                const localModel = this.getModel("suggestedQuestions")
                const elemId = event.getSource().getId()
                if (elemId.includes("movie")) {
                    localModel.setProperty(
                        "/scenario",
                        JSON.parse(JSON.stringify(MOVIEMODEL))
                    )
                } else if (elemId.includes("CAP")) {
                    localModel.setProperty("/scenario", JSON.parse(JSON.stringify(CAPMODEL)))
                }
                this.resetViewModel()
                this.onNavToStandardModePress()
            },

            async resetViewModel() {
                const localModel = this.getModel("suggestedQuestions")
                await localModel.setProperty(
                    "/standard",
                    JSON.parse(JSON.stringify(STANDARDMODEL))
                )
                await localModel.setProperty(
                    "/expert",
                    JSON.parse(JSON.stringify(EXPERTMODEL))
                )
            },
            onNavToStandardModePress() {
                const localModel = this.getModel("suggestedQuestions")
                localModel.setProperty("/scenario/promptChain", "")
                this.navTo("standard")
                this.resetGraph()
            },
            onNavToExpertModePress() {
                const localModel = this.getModel("suggestedQuestions")
                localModel.setProperty("/scenario/promptChain", "")
                this.navTo("expert")
                this.resetGraph()
            },

            async onOpenHelpButtonPress(event) {
                if (!this.createGetHelpPopover) {
                    await this.initCreateGetHelpPopover()
                }
                // this.createNewGroundingDialog.setModel("TODO");
                const helpButton = event.getSource()
                this.createGetHelpPopover.openBy(helpButton)
                /** Once the grounding has been created and stored, its metadata need to
                 * be added to the model to update the list of available groundings */
            },

            async initCreateGetHelpPopover() {
                this.createGetHelpPopover = await Fragment.load({
                    id: "getHelpPopover",
                    name: "productsearchrag.view.GetHelpPopover",
                    controller: this
                })
                const popover = this.createGetHelpPopover
                this.getView().addDependent(this.createGetHelpPopover)
            },

            async initCreateGetScenariosPopover() {
                this.createGetScenariosPopover = await Fragment.load({
                    id: "getScenariosPopover",
                    name: "productsearchrag.view.GetScenariosPopover",
                    controller: this
                })
                const popover = this.createGetScenariosPopover
                this.getView().addDependent(this.createGetScenariosPopover)
            }

        });
    });
