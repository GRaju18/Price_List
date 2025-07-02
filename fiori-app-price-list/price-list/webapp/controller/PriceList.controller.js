sap.ui.define([
	"com/9b/priceList/controller/BaseController",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"com/9b/priceList/model/models"
], function (BaseController, Fragment, Filter, FilterOperator, model) {
	"use strict";

	return BaseController.extend("com.9b.priceList.controller.PriceList", {
		formatter: model,

		onInit: function () {
			//	this.getAppConfigData();
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			// this.onListScroll();

			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
			this.getOwnerComponent().getModel("jsonModel").setProperty("/createMode", false);

			var that = this;

			this._page = 0;
			this._pageSize = 500;
			this._loading = true;
			this._initialLoadDone = false;

			var oTable = this.getView().byId("InventoryTable");
			oTable.attachUpdateFinished(this.onScrollLoad.bind(this));
			// oTable.attachUpdateFinished(this.onScrollLoad.bind(this)).once();

			// Optional: Refresh every 3 mins
			setInterval(function () {
				that.onChanagePriceList(true); // Reset flag
			}, 180000);

		},

		// updateStarted: function () {
		// 	this._loading = true;
		// },

		// updateFinished: function () {
		// 	this._loading = false;
		// 	this._page++;
		// },

		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "PriceList") {
				var jsonModel = this.getOwnerComponent().getModel("jsonModel");
				this.loadPriceListData();
				this.onChanagePriceList();
				jsonModel.setProperty("/selectedPriceList", 1);

			}
		},

		loadPriceListData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/priceListBusy", true);
			this.readServiecLayer("/b1s/v1/PriceLists", function (data) {
				jsonModel.setProperty("/priceListName", "1");
				jsonModel.setProperty("/priceListData", data.value);

			}, this.getView());

		},

		// onSearch: function (oEvent) {
		// 	var oTableSearchState = [],
		// 		sQuery = oEvent.getParameter("newValue");
		// 	if (sQuery && sQuery.length > 0) {
		// 		oTableSearchState = [new Filter("ItemCode", FilterOperator.Contains, sQuery, false),
		// 			new Filter("ItemName", FilterOperator.Contains, sQuery, false),
		// 			new Filter("Price_Each", FilterOperator.EQ, sQuery, false)
		// 		];
		// 		var combinedFilter = new Filter({
		// 			filters: oTableSearchState,
		// 			and: false
		// 		});
		// 		this.getView().byId("InventoryTable").getBinding("items").filter([combinedFilter]);
		// 		//this.getView().byId("oList").getBinding("items").filter([combinedFilter]);
		// 	} else {
		// 		this.getView().byId("InventoryTable").getBinding("items").filter([]);
		// 		//this.getView().byId("oList").getBinding("items").filter([]);
		// 	}
		// },

		onScrollLoad: function (evt) {
			// this.onChanagePriceList();

			var searchField = this.getView().byId("searchFieldTable").mProperties._semanticFormValue;

			var scroll = evt.getParameter("reason");
			if (scroll == "Growing" && !searchField) {
				this.onChanagePriceList().then(() => {
					this._loading = false;
				});

			}
		},

		fillFilterLoad: function (elementC, removedText) {
			var orFilter = [];
			var andFilter = [];
			var that = this;

			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var priceList = jsonModel.getProperty("/selectedPriceList");
			var itemsData = jsonModel.getProperty("/itemMasterData");

			// Reset paging
			this._page = 0;
			this._loading = false;
			that.orSearchFilter = [];

			$.each(elementC.getTokens(), function (i, info) {
				var value = info.getText();
				if (value !== removedText) {

					const filterStr =
						"?$filter=PriceList eq '" + priceList + "' and " +
						"(contains(ItemName_Caps, '" + encodeURIComponent(value.toUpperCase()) + "'))" +
						"&$orderby=ItemCode";

					that.readServiecLayer("/b1s/v1/sml.svc/PRICELISTSQUERY" + filterStr, (data) => {
						that.orSearchFilter.push(data.value);

						if (elementC.getTokens().length == i + 1) {

							const unique = Array.from(
								new Map(that.orSearchFilter.flat().map(item => [JSON.stringify(item), item])).values());

							jsonModel.setProperty("/itemMasterData", unique);
							jsonModel.setProperty("/itemCount", unique.length || 0);

							andFilter.push(new sap.ui.model.Filter({
								filters: unique,
								and: false,
								caseSensitive: false
							}));

							that.getView().byId("InventoryTable").getBinding("items").filter(andFilter);

						}

					}, that.getView());

					// orFilter.push(new sap.ui.model.Filter("ItemName_Caps", "Contains", value.toLowerCase()));
					// orFilter.push(new sap.ui.model.Filter("ItemName", "Contains", value.toLowerCase()));

				}
			});

		},

		onSearch: function (oEvent) {
			const query = oEvent.getParameter("value") || "";
			const jsonModel = this.getOwnerComponent().getModel("jsonModel");
			const priceList = jsonModel.getProperty("/selectedPriceList");

			var itemsData = jsonModel.getProperty("/itemMasterData");

			// Reset paging
			this._page = 0;
			this._loading = false;

			// Server-side filter for contains (substringof in OData v2)
			const filterStr =
				"?$filter=PriceList eq '" + priceList + "' and " +
				"(contains(ItemCode, '" + encodeURIComponent(query) + "') or contains(ItemName, '" + encodeURIComponent(query) + "'))" +
				"&$top=" + this._pageSize +
				"&$skip=" + (this._page * this._pageSize) +
				"&$orderby=ItemCode";

			//  const filterStr = 
			// "?$filter=PriceList eq '" + priceList + "' and " +
			// "(substringof('" + query + "', ItemCode) or substringof('" + query + "', ItemName))" +
			// "&$top=" + this._pageSize +
			// "&$skip=" + (this._page * this._pageSize) +
			// "&$orderby=ItemCode";

			this.readServiecLayer("/b1s/v1/sml.svc/PRICELISTSQUERY" + filterStr, (data) => {
				jsonModel.setProperty("/itemMasterData", data.value || []);
				jsonModel.setProperty("/itemCount", data.value.length || 0);
			}, this.getView());
		},

		onChanagePriceList: function (evt) {
			var that = this;
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			// var priceList = Number(evt?.getParameters().selectedItem.getKey() || 1 ) ; // Or store last selected

			var selectedPriceList = jsonModel.getProperty("/selectedPriceList");

			var priceList;
			if (!evt) {
				priceList = 1;
				if (!!selectedPriceList) {
					priceList = Number(selectedPriceList);
				}

			} else {
				priceList = evt.getParameters().selectedItem.getKey();
				priceList = Number(priceList);
				jsonModel.setProperty("/itemMasterData", []);
				jsonModel.setProperty("/selectedPriceList", priceList);
				this._page = 0;

			}

			var skip = this._page * this._pageSize;
			var top = this._pageSize;

			var filters =
				"?$filter=PriceList eq '" + priceList + "'" +
				"&$skip=" + skip +
				"&$top=" + top;

			var orderBy = "&$orderby=ItemCode";

			return new Promise(function (resolve, reject) {
				that.readServiecLayer("/b1s/v1/sml.svc/PRICELISTSQUERY" + filters + orderBy, function (data) {
					var currentData = jsonModel.getProperty("/itemMasterData") || [];
					var combined = currentData.concat(data.value || []);
					jsonModel.setProperty("/itemMasterData", combined);
					jsonModel.setProperty("/itemCount", combined.length);
					that._page++;

					resolve(); // Done
				}, that.getView(), function (err) {
					console.error("Failed to load page:", err);
					reject(err);
				});
			});
		},

		// onChanagePriceList: function (evt, reset) {
		// 	var jsonModel = this.getOwnerComponent().getModel("jsonModel");
		// 	if (this._loading) return;

		// 	var that = this;
		// 	var priceList = 1;

		// 	if (evt) {
		// 		priceList = Number(evt.getParameters().selectedItem.getKey());
		// 	}

		// 	if (reset) {
		// 		this._page = 0;
		// 		jsonModel.setProperty("/itemMasterData", []);
		// 	}

		// 	this._loading = true;

		// 	var filters = 
		// 		"?$filter=PriceList eq '" + priceList + "'" +
		// 		"&$skip=" + (this._page * this._pageSize) +
		// 		"&$top=" + this._pageSize +
		// 		"&$orderby=ItemCode";

		// 	this.readServiecLayer("/b1s/v1/sml.svc/PRICELISTSQUERY" + filters, function (data) {
		// 		var currentData = jsonModel.getProperty("/itemMasterData") || [];
		// 		var newData = data.value || [];
		// 		jsonModel.setProperty("/itemMasterData", currentData.concat(newData));
		// 		jsonModel.setProperty("/itemCount", currentData.length + newData.length);

		// 		that._page++;
		// 		that._loading = false;
		// 	}, this.getView());
		// },

		// onChanagePriceList: function (evt) {
		// 	var jsonModel = this.getOwnerComponent().getModel("jsonModel");
		// 	if (this._loading) return;

		// 	var that = this;
		// 	var priceList;
		// 	if (!evt) {
		// 		priceList = 1;
		// 	} else {
		// 		priceList = evt.getParameters().selectedItem.getKey();
		// 		priceList = Number(priceList);
		// 		this._page = 0;
		// 		this._pageSize = 100;
		// 		this._loading = false;
		// 	}

		// 	// var filters = "?$filter=PriceList eq " + "'" + priceList + "' and page '"  + this._page + "' &size"  + this._pageSize ;
		// 	var filters = 
		// 	  "?$filter=PriceList eq '" + priceList + "'" +
		// 	  "&$skip=" + (this._page * this._pageSize) +
		// 	  "&$top=" + this._pageSize;

		// 	var currentData = jsonModel.getProperty("/itemMasterData");

		// 	var orderBy = "&$orderby=ItemCode";
		// 	this.readServiecLayer("/b1s/v1/sml.svc/PRICELISTSQUERY" + filters + orderBy, function (data) {
		// 		jsonModel.setProperty("/itemMasterData",currentData.concat(data.value));
		// 		jsonModel.setProperty("/itemCount", currentData.length);
		// 		that._page++;
		//     	that._loading = false;
		// 	}, this.getView());

		// 	var filters = "?$filter=PriceList eq " + "'" + priceList + "'";
		// 	var orderBy = "&$orderby=ItemCode";
		// 	this.readServiecLayer("/b1s/v1/sml.svc/PRICELISTSQUERY" + filters + orderBy, function (data) {
		// 		jsonModel.setProperty("/itemMasterData", data.value);
		// 		jsonModel.setProperty("/itemCount", data.value.length);
		// 	}, this.getView());

		// },

		handleEditSave: function () {
			var that = this;
			var modifiedData = [];
			var jsonModel = that.getOwnerComponent().getModel("jsonModel");
			var itemData = $.extend(true, [], jsonModel.getProperty("/itemMasterData"));
			$.each(itemData, function (i, info) {
				if (info.isUpdated) {
					modifiedData.push(info);
				}
			});
			var length = modifiedData.length - 1;
			this.getView().setBusy(true);
			modifiedData.filter(function (info, i) {
				var infoData = {
					ItemCode: info.ItemCode,
					ItemName: info.ItemName,
					ItemPrices: [{
						"PriceList": info.PriceList,
						"Price": Number(info.Price_Each).toFixed(2),
						"BasePriceList": 1,
						"Currency": "$"
					}]
				};
				var priceList = Number(info.PriceList);

				that.updateServiecLayer("/b1s/v1/Items" + "('" + info.ItemCode + "')", function () {
					if (length === i) {
						that.getView().setBusy(false);
						sap.m.MessageBox.success("Item Price Updated");
						that.onChanagePriceList();
						that.handleEditCancel();
					}
				}, infoData, "PATCH");
			});
		},
		handleValueChange: function (evt) {
			var sObj = evt.getSource().getBindingContext("jsonModel");
			sObj.getObject().isUpdated = true;
		},
		onPriceListSave: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			if (jsonModel.getProperty("/priceEditMode")) {
				var sObj = jsonModel.getProperty("/itemPriceDetails");
				var payLoad = {
					"ItemCode": sObj.ItemCode,
					"ItemPrices": [{
						"PriceList": sObj.PriceList
					}]
				};
				var UOMObj = {};
				UOMObj = [{
					"PriceList": sObj.PriceList,
					"UoMEntry": 1,
					"Price": sObj["1_2Oz"],
					"Currency": "$",
					"Auto": "tYES"
				}, {
					"PriceList": sObj.PriceList,
					"UoMEntry": 2,
					"Price": sObj["1g"],
					"Currency": "$",
					"Auto": "tYES"
				}, {
					"PriceList": sObj.PriceList,
					"UoMEntry": 3,
					"Price": sObj["2g"],
					"Currency": "$",
					"Auto": "tYES"
				}, {
					"PriceList": sObj.PriceList,
					"UoMEntry": 4,
					"Price": sObj["1_8Oz"],
					"Currency": "$",
					"Auto": "tYES"
				}, {
					"PriceList": sObj.PriceList,
					"UoMEntry": 5,
					"Price": sObj["1_4Oz"],
					"Currency": "$",
					"Auto": "tYES"
				}, {
					"PriceList": sObj.PriceList,
					"UoMEntry": 6,
					"Price": sObj["1_2Oz"],
					"Currency": "$",
					"Auto": "tYES"
				}, {
					"PriceList": sObj.PriceList,
					"UoMEntry": 7,
					"Price": sObj["1Oz"],
					"Currency": "$",
					"Auto": "tYES"
				}, {
					"PriceList": sObj.PriceList,
					"UoMEntry": 10,
					"Price": sObj["16Oz"],
					"Currency": "$",
					"Auto": "tYES"
				}];
				payLoad.ItemPrices[0].UoMPrices = UOMObj;
				var priceInfoDialog = this.priceInfoDialog;
				var loadData = this.loadData;
				var priceList = sObj.PriceList;
				var priceListName = this.priceListName;
				priceInfoDialog.setBusy(true);
				this.updateServiecLayer("/b1s/v1/Items" + "('" + sObj.ItemCode + "')", function () {
					priceInfoDialog.setBusy(false);
					priceInfoDialog.close();
					sap.m.MessageToast.show("details updated successfully");
					loadData(priceList, priceListName);
				}, payLoad, "PATCH");
			} else {
				jsonModel.setProperty("/priceEditMode", true);
			}
		},
		handleEdit: function () {
			this.getOwnerComponent().getModel("jsonModel").setProperty("/createMode", true);
		},
		handleEditCancel: function () {
			this.getOwnerComponent().getModel("jsonModel").setProperty("/createMode", false);
		}
	});
});