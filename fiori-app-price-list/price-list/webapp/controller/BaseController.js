/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/UIComponent",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox",
	"sap/ui/model/Filter"
], function (Controller, UIComponent, History, MessageBox, Filter) {
	"use strict";
	return Controller.extend("com.9b.priceList.controller.BaseController", {
		orSearchFilter:[],
		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		getAppConfigData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters = "?$filter=U_NAPP eq 'AllApps'";
			this.readServiecLayer("/b1s/v1/U_NCNFG" + filters, function (data) {
				var uomVals = [],
					uomObj;
				if (data.value.length > 0) {
					$.each(data.value, function (i, e) {
						if (e.U_NFLDS === "WasteUOM") {
							if (e.U_NVALUE !== "") {
								var uoms = e.U_NVALUE.split(",");
								$.each(uoms, function (index, uom) {
									uomObj = {
										key: uom,
										text: uom
									};
									uomVals.push(uomObj);
								});
							}

						}
					});

				}
				jsonModel.setProperty("/uomVals", uomVals);
			});
		},

		removeZeros: function (value) {
			if (value == 0) {
				return "";
			} else {
				return value;
			}
		},

		createBatchCall: function (batchUrl, callBack, busyDialog) {
			var jsonModel = this.getView().getModel("jsonModel");
			var splitBatch, count;
			count = Math.ceil(batchUrl.length / 100);
			jsonModel.setProperty("/count", count);
			if (batchUrl.length > 100) {
				do {
					splitBatch = batchUrl.splice(0, 100);
					this.callBatchService(splitBatch, callBack, busyDialog);
				} while (batchUrl.length > 100);
				if (batchUrl.length > 0) {
					this.callBatchService(batchUrl, callBack, busyDialog);
				}
			} else {
				this.callBatchService(batchUrl, callBack, busyDialog);
			}

			//	callBack.call(this, errorMessage);
		},
		callBatchService: function (batchUrl, callBack, busyDialog) {
			var reqHeader = "--clone_batch--\r\nContent-Type: application/http \r\nContent-Transfer-Encoding:binary\r\n\r\n";
			var payLoad = reqHeader;
			$.each(batchUrl, function (i, sObj) {
				payLoad = payLoad + sObj.method + " " + sObj.url + "\r\n\r\n";
				payLoad = payLoad + JSON.stringify(sObj.data) + "\r\n\r\n";
				if (batchUrl.length - 1 === i) {
					payLoad = payLoad + "\r\n--clone_batch--";
				} else {
					payLoad = payLoad + reqHeader;
				}
			});
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var baseUrl = jsonModel.getProperty("/serLayerbaseUrl");
			//	var sessionID = jsonModel.getProperty("/sessionID");
			if (busyDialog) {
				busyDialog.setBusy(true);
			}
			if (location.host.indexOf("webide") === -1) {
				baseUrl = "";
			}
			var settings = {
				"url": baseUrl + "/b1s/v1/$batch",
				"method": "POST",
				xhrFields: {
					withCredentials: true
				},
				//"timeout": 0,
				"headers": {
					"Content-Type": "multipart/mixed;boundary=clone_batch"
				},
				//	setCookies: "B1SESSION=" + sessionID,
				"data": payLoad,
				success: function (res) {
					var count = jsonModel.getProperty("/count");
					count--;
					jsonModel.setProperty("/count", count);
					try {
						var errorMessage = "";
						res.split("\r").forEach(function (sString) {
							if (sString.indexOf("error") !== -1) {
								var oString = JSON.parse(sString.replace(/\n/g, ""));
								errorMessage = oString.error.message.value;
							}
						});
					} catch (err) {
						//	console.log("error " + err);
					}
					//	callBack.call(that, res, errorMessage);
					if (errorMessage) {
						var errorTxt = jsonModel.getProperty("/errorTxt");
						errorTxt.push(errorMessage);
						jsonModel.setProperty("/errorTxt", errorTxt);
					}
					if (count === 0) {
						callBack.call(that, errorMessage);
						if (busyDialog) {
							busyDialog.setBusy(false);
						}
					}
				},
				error: function (error) {
					var count = jsonModel.getProperty("/count");
					count--;
					jsonModel.setProperty("/count", count);
					if (count === 0) {
						callBack.call(that);
						if (busyDialog) {
							busyDialog.setBusy(false);
						}
					}
					if (error.statusText) {
						MessageBox.error(error.statusText);
					} else if (error.responseJSON) {
						MessageBox.error(error.responseJSON.error.message.value);
					}

				}
			};

			//	const text = '{"name":"John\n", "birth":"14/12/1989\t"}';
			//	const result = text.escapeSpecialCharsInJSONString();
			//	console.log(result);
			$.ajax(settings).done(function () {
				//	console.log(response);
			});
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		convertUTCDate: function (date) {
			date.setHours(new Date().getHours());
			date.setMinutes(new Date().getMinutes());
			date.setSeconds(new Date().getSeconds());
			var utc = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
			return utc;
		},
		convertUTCDatePost: function (date) {
			date.setHours(new Date().getHours());
			date.setMinutes(new Date().getMinutes());
			date.setSeconds(new Date().getSeconds());
			var utc = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
			return utc;
		},

		// convertUTCDateTime: function (date) {
		// 	var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
		// 		pattern: 'yyyy-MM-ddThh:mm:ss',
		// 		UTC: true
		// 	});
		// 	var postingDate = dateFormat.format(new Date(date));
		// 	var finalDate = "/Date(" + new Date(postingDate + "Z").getTime() + ")/";
		// 	return finalDate;
		// },

		convertUTCDateTime: function (date) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-ddThh:mm:ss",
				UTC: true
			});
			var postingDate = dateFormat.format(new Date(date));
			var finalDate = postingDate + "Z";
			return finalDate;
		},
		convertUTCDateMETRC: function (date) {
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyy-MM-dd",
				UTC: true
			});
			var finalDate = dateFormat.format(new Date(date));
			return finalDate;
		},

		addLeadingZeros: function (num, size) {
			num = num.toString();
			while (num.length < size) num = "0" + num;
			return num;
		},
		formatTagIDString: function (bTagValue) {
			if (bTagValue !== undefined && bTagValue) {
				var lastNos = [];
				var withChar = false;
				var strtNos = [];
				$.each(bTagValue.split("").reverse(), function (i, e) {
					if (!isNaN(e) && !withChar && i < 10) {
						lastNos.push(e);
					} else {
						withChar = true;
						strtNos.push(e);
					}
				});
				return [lastNos.reverse().join(""), strtNos.reverse().join("")];
			}
		},

		generatePlantID: function (data, noOfPlants) {
			var maxValue, returnValue;
			if (data.length > 0) {
				/*	maxValue = Math.max.apply(Math, data.map((data) => {
						returnValue = data.NPLID.replace(/^\D+/g, '');
						return returnValue;
					}));*/
			} else {
				maxValue = 0;
			}
			var plantIDs = [],
				n, s;
			for (n = maxValue + 1; n <= (noOfPlants + maxValue); n++) {
				s = n + "";
				while (s.length < 4) s = "0" + s;
				plantIDs.push("P" + s);
			}
			return plantIDs;
		},

		generateMasterPlantID: function (data, noOfPlants, strainID) {
			var maxValue, returnValue;
			if (data.length > 0) {
				var existingStrain = $.grep(data, function (e) {
					if (e.U_NPLID && e.U_NPLID.search(strainID) === 0) {
						return e;
					}
				});
				if (existingStrain.length > 0) {
					maxValue = Math.max.apply(Math, existingStrain.map(function (existingStrain) {
						var plantId = existingStrain.U_NPLID.split("-")[existingStrain.U_NPLID.split("-").length - 1];
						returnValue = plantId.replace(/^\D+/g, '');
						return returnValue;
					}));
				} else {
					maxValue = 0;
				}
			} else {
				maxValue = 0;
			}
			var plantIDs = [],
				n, s;
			for (n = maxValue + 1; n <= (noOfPlants + maxValue); n++) {
				s = n + "";
				while (s.length < 4) s = "0" + s;
				plantIDs.push(strainID + "-P" + s);
				var obj = {
					U_NPLID: strainID + "-P" + s
				};
				data.push(obj);
			}
			return plantIDs;
		},

		generateCloneBatchID: function (text, strainID, data) {
			var maxValue, returnValue;
			if (data.length > 0) {
				var existingBatches = $.grep(data, function (e) {
					if (e.U_NCBID != null) {
						if (e.U_NCBID.search(strainID) > -1) {
							return e;
						}
					}
				});
				if (existingBatches.length > 0) {
					maxValue = Math.max.apply(Math, existingBatches.map(function (existingBatches) {
						var bId = existingBatches.U_NCBID.split("-")[existingBatches.U_NCBID.split("-").length - 1];
						returnValue = bId.replace(/^\D+/g, '');
						return returnValue;
					}));
				} else {
					maxValue = 0;
				}
			} else {
				maxValue = 0;
			}
			var n, s, id;
			for (n = maxValue; n <= (maxValue + 1); n++) {
				s = n + "";
				while (s.length < 3) s = "0" + s;
				id = text + "-" + strainID + "-B" + s;
			}
			return id;
		},

		errorHandler: function (error) {
			var that = this;
			var resText = JSON.parse(error.responseText).error.message.value;
			MessageBox.error(resText);
			that.getView().setBusy(false);
		},
		successHandler: function (text, resText) {
			MessageBox.success(text + resText + " created successfully", {
				closeOnNavigation: false,
				onClose: function () {}
			});
		},

		formatQtyUnit: function (amount, unit) {
			return "Watered " + amount + " " + unit;
		},

		daysInRoom: function (date) {
			var cDate = new Date();
			var cTime = cDate.getTime();
			if (date) {
				var vTime = date.getTime();
				var days = Math.floor((cTime - vTime) / 8.64e+7);
				return days;
			}
		},

		createFilter: function (key, operator, value, useToLower) {
			return new Filter(useToLower ? "tolower(" + key + ")" : key, operator, useToLower ? "'" + value.toLowerCase() + "'" : value);
		},

		validatebarCodePackage: function (tag, barcodeData) {
			var fStateId = BigInt(tag.replace(/[^0-9]/g, ''));
			var existingbarcodeData = $.grep(barcodeData, function (e, i) {
				var bTag = BigInt(e.NAFID.replace(/[^0-9]/g, ''));
				var eTag = BigInt(e.NEDID.replace(/[^0-9]/g, ''));
				if (bTag <= fStateId && fStateId <= eTag) {
					return e;
				}
			});
			return existingbarcodeData;
		},

		deleteItems: function (table) {
			var that = this;
			//	var table = this.getView().byId("clonePlannerTable");
			if (table.getSelectedIndices().length > 0) {
				$.each(table.getSelectedIndices(), function (i, e) {
					var updateObject = table.getContextByIndex(e).getObject();
					var sUrl = updateObject.__metadata.uri.split("/")[updateObject.__metadata.uri.split('/').length - 1];
					/*	var payLoad = {
							NSTUS: "V",
							NPFBC: updateObject.NPFBC
						};*/
					updateObject.NSTUS = "V";
					updateObject.NVGRD = that.convertDate(new Date());
					that.getOwnerComponent().getModel().remove("/" + sUrl, updateObject, {
						success: function (data) {

						},
						error: function () {

						}
					});
					//	arr.push(plantBarCode);
				});

			}
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Handler for the Avatar button press event
		 * @public
		 */
		onAvatarPress: function () {
			var sMessage = this.getResourceBundle().getText("avatarButtonMessageToastText");
			sap.m.MessageToast.show(sMessage);
		},

		/**
		 * React to FlexibleColumnLayout resize events
		 * Hides navigation buttons and switches the layout as needed
		 * @param {sap.ui.base.Event} oEvent the change event
		 */
		onStateChange: function (oEvent) {
			var sLayout = oEvent.getParameter("layout"),
				iColumns = oEvent.getParameter("maxColumnsCount");

			if (iColumns === 1) {
				this.getModel("appView").setProperty("/smallScreenMode", true);
			} else {
				this.getModel("appView").setProperty("/smallScreenMode", false);
				// swich back to two column mode when device orientation is changed
				if (sLayout === "OneColumn") {
					this._setLayout("Two");
				}
			}
		},

		/**
		 * Sets the flexible column layout to one, two, or three columns for the different scenarios across the app
		 * @param {string} sColumns the target amount of columns
		 * @private
		 */
		_setLayout: function (sColumns) {
			if (sColumns) {
				this.getModel("appView").setProperty("/layout", sColumns + "Column" + (sColumns === "One" ? "" : "sMidExpanded"));
			}
		},

		/**
		 * Apparently, the middle page stays hidden on phone devices when it is navigated to a second time
		 * @private
		 */
		_unhideMiddlePage: function () {
			// bug in sap.f router, open ticket and remove this method afterwards
			setTimeout(function () {
				this.getView().getParent().getParent().getCurrentMidColumnPage().removeStyleClass("sapMNavItemHidden");
			}.bind(this), 0);
		},

		/**
		 * Navigates back in browser history or to the home screen
		 */
		onBack: function () {
			this._unhideMiddlePage();
			var oHistory = History.getInstance();
			var oPrevHash = oHistory.getPreviousHash();
			if (oPrevHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("home");
			}
		},

		/*Methods for multiInput for sarch field for scan functionality start*/
		onSubmitMultiInput: function (oEvent) {
			oEvent.getSource()._bUseDialog = false;
			var value = oEvent.getSource().getValue();
			if (!value) {
				this.fillFilterLoad(oEvent.getSource());
				// this.orSearchFilter = [];
				return;
			}
			
			value = value.replace(/\^/g, "");
			oEvent.getSource().addToken(new sap.m.Token({
				key: value,
				text: value
			}));
			var orFilter = [];
			var andFilter = [];
			oEvent.getSource().setValue("");
			this.fillFilterLoad(oEvent.getSource());
		},

		tokenUpdateMultiInput: function (oEvent) {
			this.fillFilterLoad(oEvent.getSource(), oEvent.getParameter("removedTokens")[0].getText());
		},

		onChanageNavigate: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var serLayerTargetUrl = jsonModel.getProperty("/target");
			var pageTo = this.byId("navigate").getSelectedKey();
			var AppNavigator;
			if (pageTo === "Strain") {
				AppNavigator = serLayerTargetUrl.Strain;
			}
			if (pageTo === "ClonePlanner") {
				AppNavigator = serLayerTargetUrl.ClonePlanner;
			}
			if (pageTo === "VegPlanner") {
				AppNavigator = serLayerTargetUrl.VegPlanner;
			}
			if (pageTo === "FlowerPlanner") {
				AppNavigator = serLayerTargetUrl.FlowerPlanner;
			}
			if (pageTo === "Harvest") {
				AppNavigator = serLayerTargetUrl.Harvest;
			}
			if (pageTo === "MotherPlanner") {
				AppNavigator = serLayerTargetUrl.MotherPlanner;
			}
			if (pageTo === "DestroyedPlants") {
				AppNavigator = serLayerTargetUrl.DestroyedPlants;
			}
			if (pageTo === "Waste") {
				AppNavigator = serLayerTargetUrl.Waste;
			}
			if (pageTo === "ManagePackages") {
				AppNavigator = serLayerTargetUrl.ManagePackages;
			}
			if (pageTo === "METRCTag") {
				AppNavigator = serLayerTargetUrl.METRCTag;
			}
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: AppNavigator
				}
			});
		},

		navToStrainDetails: function (oEvent) {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sObject = oEvent.getSource().getBindingContext("jsonModel").getObject();
			var serLayerTargetUrl = jsonModel.getProperty("/target");
			var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation"); // get a handle on the global XAppNav service
			oCrossAppNavigator.toExternal({
				target: {
					shellHash: serLayerTargetUrl.Strain + "&/detail/" + sObject.U_NSTID + "/TwoColumnsMidExpanded"
				}
			});
		},

		readServiecLayer: function (entity, callBack, busyDialog) {
			var that = this;
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var sessionID = jsonModel.getProperty("/sessionID");
			if (sessionID === undefined) {
				var loginPayLoad = jsonModel.getProperty("/userAuthPayload");
				loginPayLoad = JSON.stringify(loginPayLoad);
				if (busyDialog) {
					busyDialog.setBusy(true);
				}
				$.ajax({
					url: jsonModel.getProperty("/serLayerbaseUrl") + "/b1s/v1/Login",
					data: loginPayLoad,
					type: "POST",
					xhrFields: {
						withCredentials: true
					},
					dataType: "json", // expecting json response
					success: function (data) {
						jsonModel.setProperty("/sessionID", data.SessionId);
						//	var sessionID = that.getOwnerComponent().getModel("jsonModel").getProperty("/sessionID");
						$.ajax({
							type: "GET",
							header: {
								"B1S-CaseInsensitive": true,
							},
						
							xhrFields: {
								withCredentials: true
							},
							url: jsonModel.getProperty("/serLayerbaseUrl") + entity,
							setCookies: "B1SESSION=" + data.SessionId,
							dataType: "json",
							success: function (res) {
								if (busyDialog) {
									busyDialog.setBusy(false);
								}
								callBack.call(that, res);
							},
							error: function (error) {
								if (busyDialog) {
									busyDialog.setBusy(false);
								}
								MessageBox.error(error.responseJSON.error.message.value);
							}
						});
					},
					error: function () {
						sap.m.MessageToast.show("Error with authentication");
					}
				});
			} else {
				if (busyDialog) {
					busyDialog.setBusy(true);
				}
				$.ajax({
					type: "GET",
					xhrFields: {
						withCredentials: true
					},
					header: {
								"B1S-CaseInsensitive": true,
							},
					url: jsonModel.getProperty("/serLayerbaseUrl") + entity,
					setCookies: "B1SESSION=" + sessionID,
					dataType: "json",
					success: function (res) {
						if (busyDialog) {
							busyDialog.setBusy(false);
						}
						callBack.call(that, res);
					},
					error: function (error) {
						if (busyDialog) {
							busyDialog.setBusy(false);
						}
						MessageBox.error(error.responseJSON.error.message.value);
					}
				});
			}
		},
		updateServiecLayer: function (entity, callBack, payLoad, method, busyDialog) {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var sessionID = jsonModel.getProperty("/sessionID");
			if (sessionID === undefined) {
				var loginPayLoad = jsonModel.getProperty("/userAuthPayload");
				loginPayLoad = JSON.stringify(loginPayLoad);
				if (busyDialog) {
					busyDialog.setBusy(true);
				}
				$.ajax({
					url: jsonModel.getProperty("/serLayerbaseUrl") + "/b1s/v1/Login",
					data: loginPayLoad,
					type: "POST",
					xhrFields: {
						withCredentials: true
					},
					dataType: "json", // expecting json response
					success: function (data) {
						if (busyDialog) {
							busyDialog.setBusy(false);
						}
						jsonModel.setProperty("/sessionID", data.SessionId);
						payLoad = JSON.stringify(payLoad);
						$.ajax({
							type: method,
							xhrFields: {
								withCredentials: true
							},
							url: jsonModel.getProperty("/serLayerbaseUrl") + entity,
							setCookies: "B1SESSION=" + data.SessionId,
							dataType: "json",
							data: payLoad,
							success: function (res) {
								if (busyDialog) {
									busyDialog.setBusy(false);
								}
								callBack.call(that, res);
							},
							error: function (error) {
								if (busyDialog) {
									busyDialog.setBusy(false);
								}
								MessageBox.error(error.responseJSON.error.message.value);
							}
						});
					},
					error: function () {
						sap.m.MessageToast.show("Error with authentication");
					}
				});
			} else {
				payLoad = JSON.stringify(payLoad);
				if (busyDialog) {
					busyDialog.setBusy(true);
				}
				$.ajax({
					type: method,
					xhrFields: {
						withCredentials: true
					},
					url: jsonModel.getProperty("/serLayerbaseUrl") + entity,
					setCookies: "B1SESSION=" + sessionID,
					dataType: "json",
					data: payLoad,
					success: function (res) {
						if (busyDialog) {
							busyDialog.setBusy(false);
						}
						callBack.call(that, res);
					},
					error: function (error) {
						if (busyDialog) {
							busyDialog.setBusy(false);
						}
						MessageBox.error(error.responseJSON.error.message.value);
					}
				});
			}
		},

		onChangeMultiInput: function (oEvent) {
			oEvent.getSource()._bUseDialog = false;
			var value = oEvent.getSource().getValue();
			if (value.indexOf("^") !== -1) {
				value = value.replace(/\^/g, "");
				oEvent.getSource().addToken(new sap.m.Token({
					key: value,
					text: value
				}));
				var orFilter = [];
				var andFilter = [];
				oEvent.getSource().setValue("");
				this.fillFilterLoad(oEvent.getSource());
			}
		},
		

		metricSyncFail: function (dialog, error) {
			sap.m.MessageBox.error(JSON.parse(error.responseText).Message);
			dialog.setBusy(false);
			return;
		},
		getMetricsCredentials: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters = "?$filter=U_NITTP eq 'METRC'";
			jsonModel.setProperty("/metrcBusy", true);
			jsonModel.setProperty("/enableSyncNow", false);
			this.readServiecLayer("/b1s/v1/NINGT" + filters, function (data) {
				jsonModel.setProperty("/metrcBusy", false);
				if (data.value.length > 0) {
					jsonModel.setProperty("/metrcData", data.value[0]);
				} else {
					jsonModel.setProperty("/metrcData", {});
				}

			});
		},
		callMetricsService: function (entity, methodType, data, success, error) {
			var that = this;
			// var obj = this.getView().getModel("jsonModel").getProperty("/selectedMetrics");
			var metricConfig = this.getView().getModel("jsonModel").getProperty("/metrcData");
			$.ajax({
				data: JSON.stringify(data),
				type: methodType,
				async: false,
				url: metricConfig.U_NIURL + entity,
				contentType: "application/json",
				headers: {
					"Authorization": "Basic " + btoa(metricConfig.U_NVNDK + ":" + metricConfig.U_NUSRK)
				},
				success: function (sRes) {
					that.createMetricLog(entity, methodType, data, sRes, "200");
					success.call(that, sRes);
				},
				error: function (eRes) {
					//	error.bind(this);
					var errorMsg = "";
					/*if (eRes.statusText) {
						errorMsg = eRes.statusText;
					} else*/
					if (eRes.responseJSON && eRes.responseJSON.length > 0) {
						$.each(eRes.responseJSON, function (i, e) {
							errorMsg = e.message + "\n";
						});
					} else if (eRes.responseJSON && eRes.responseJSON.Message) {
						errorMsg = eRes.responseJSON.Message;
					} else if (eRes.statusText && eRes.status === 401) {
						errorMsg = "Unauthorized";
					} else if (eRes.statusText) {
						errorMsg = eRes.statusText;
					}
					error.call(that, errorMsg);
					that.createMetricLog(entity, methodType, data, errorMsg, eRes.status);
					sap.m.MessageToast.show(errorMsg);
				}
			});
		},
		// capture metric log
		createMetricLog: function (sUrl, method, reqPayload, resPayload, statusCode) {
			var data = {
				U_NDTTM: this.convertUTCDate(new Date()),
				U_NUSID: this.getView().getModel("jsonModel").getProperty("/userName"),
				U_NLGMT: method,
				U_NLURL: sUrl,
				U_NLGBD: JSON.stringify(reqPayload),
				U_NLGRP: JSON.stringify(resPayload),
				U_NLGST: statusCode,
				U_NAPP: "CP"
			};
			this.updateServiecLayer("/b1s/v1/NMTLG", function () {

			}.bind(this), data, "POST");
		},
		prepareBatchPayload: function () {
			var i8 = function (a, b) {
				if (!F2(a)) {
					throw {
						message: "Data is not a batch object."
					};
				}
				var e = $7("batch_");
				var p = a.__batchRequests;
				var x = "";
				var i, y;
				for (i = 0,
					y = p.length; i < y; i++) {
					x += j8(e, false) + k8(p[i], b);
				}
				x += j8(e, true);
				var _ = b.contentType.properties;
				_.boundary = e;
				return x;
			};
			var j8 = function (b, a) {
				var e = "\r\n--" + b;
				if (a) {
					e += "--";
				}
				return e + "\r\n";
			};
			var k8 = function (p, a, b) {
				var e = p.__changeRequests;
				var x;
				if (m(e)) {
					if (b) {
						throw {
							message: "Not Supported: change set nested in other change set"
						};
					}
					var y = $7("changeset_");
					x = "Content-Type: " + W7 + "; boundary=" + y + "\r\n";
					var i, _;
					for (i = 0,
						_ = e.length; i < _; i++) {
						x += j8(y, false) + k8(e[i], a, true);
					}
					x += j8(y, true);
				} else {
					x = "Content-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\n";
					var k9 = k({}, a);
					k9.handler = P3;
					k9.request = p;
					k9.contentType = null;
					p3(p, _7(a), k9);
					x += l8(p);
				}
				return x;
			};
			var l8 = function (a) {
				var b = (a.method ? a.method : "GET") + " " + a.requestUri + " HTTP/1.1\r\n";
				for (var e in a.headers) {
					if (a.headers[e]) {
						b = b + e + ": " + a.headers[e] + "\r\n";
					}
				}
				if (a.body) {
					function p(i) {
						if (i <= 0x7F)
							return 1;
						if (i <= 0x7FF)
							return 2;
						if (i <= 0xFFFF)
							return 3;
						if (i <= 0x1FFFFF)
							return 4;
						if (i <= 0x3FFFFFF)
							return 5;
						if (i <= 0x7FFFFFFF)
							return 6;
						throw new Error("Illegal argument: " + i);
					};

					function x(y) {
						var _ = 0;
						for (var i = 0; i < y.length; i++) {
							var ch = y.charCodeAt(i);
							_ += p(ch);
						}
						return _;
					};
					b += "Content-Length: " + x(a.body) + "\r\n";
				}
				b += "\r\n";
				if (a.body) {
					b += a.body;
				}
				return b;
			};
		}

	});
});