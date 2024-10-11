/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "productsearchrag/model/models",
    'sap/m/IllustrationPool'
],
    function (UIComponent, Device, models, IllustrationPool) {
        "use strict";

        return UIComponent.extend("productsearchrag.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);
                var oTntSet = {
                    setFamily: "tnt",
                    setURI: sap.ui.require.toUrl("sap/tnt/themes/base/illustrations")
                };

                // register tnt illustration set
                IllustrationPool.registerIllustrationSet(oTntSet, false);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
            },

            getContentDensityClass: function () {
                if (this.contentDensityClass === undefined) {
                    // check whether FLP has already set the content density class; do nothing in this case
                    if (
                        document.body.classList.contains("sapUiSizeCozy") ||
                        document.body.classList.contains("sapUiSizeCompact")
                    ) {
                        this.contentDensityClass = "";
                    } else if (!Device.support.touch) {
                        // apply "compact" mode if touch is not supported
                        this.contentDensityClass = "sapUiSizeCompact";
                    } else {
                        // "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
                        this.contentDensityClass = "sapUiSizeCozy";
                    }
                }
                return this.contentDensityClass;
            }
        });
    }
);