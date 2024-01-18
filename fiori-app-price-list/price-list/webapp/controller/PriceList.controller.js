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

			this.getOwnerComponent().getRouter(this).attachRoutePatternMatched(this._objectMatched, this);
			var that = this;
			setInterval(function () {
				that.onChanagePriceList();
			}, 180000);
		},

		_objectMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "PriceList") {
				this.loadPriceListData();
				this.onChanagePriceList();
				this.getOwnerComponent().getModel("jsonModel").setProperty("/createMode", false);
			}
		},

		loadPriceListData: function () {
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			jsonModel.setProperty("/priceListBusy", true);
			this.readServiecLayer("/b1s/v2/PriceLists", function (data) {
				jsonModel.setProperty("/priceListName", "1");
				jsonModel.setProperty("/priceListData", data.value);

			}, this.getView());

		},
		onSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("newValue");
			if (sQuery && sQuery.length > 0) {
				oTableSearchState = [new Filter("ItemCode", FilterOperator.Contains, sQuery, false),
					new Filter("ItemName", FilterOperator.Contains, sQuery, false),
					new Filter("Price_Each", FilterOperator.EQ, sQuery, false)
				];
				var combinedFilter = new Filter({
					filters: oTableSearchState,
					and: false
				});
				this.getView().byId("InventoryTable").getBinding("items").filter([combinedFilter]);
				//this.getView().byId("oList").getBinding("items").filter([combinedFilter]);
			} else {
				this.getView().byId("InventoryTable").getBinding("items").filter([]);
				//this.getView().byId("oList").getBinding("items").filter([]);
			}
		},
		onChanagePriceList: function (evt) {
			var priceList;
			if (!evt) {
				priceList = 1;
			} else {
				priceList = evt.getParameters().selectedItem.getKey();
				priceList = Number(priceList);
			}
			var jsonModel = this.getOwnerComponent().getModel("jsonModel");
			var filters = "?$filter=PriceList eq " + "'" + priceList + "'";
				var orderBy = "&$orderby=ItemCode";
			this.readServiecLayer("/b1s/v2/sml.svc/PRICELISTSQUERY" + filters + orderBy, function (data) {
				jsonModel.setProperty("/itemMasterData", data.value);
				jsonModel.setProperty("/itemCount", data.value.length);
			}, this.getView());

		},
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
			
				that.updateServiecLayer("/b1s/v2/Items" + "('" + info.ItemCode + "')", function () {
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
				this.updateServiecLayer("/b1s/v2/Items" + "('" + sObj.ItemCode + "')", function () {
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