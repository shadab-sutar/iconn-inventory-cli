//Importing inventory
const inventory = require('../Models/inventory');

//Display message
showError = (value) => {
    console.error(value);
}

//process user-input
processUserInput = (userInput) => {
    let values = userInput.split(':');
    validateUserInput(values);
    return true;
}

//Validate input
validateUserInput = (values) => {
    //check if user input is correct
    if (values.length < 5) {
        showError("Invalid input...");
        return;
    }

    //Check if passport number is provided
    let passport = "";
    let firstChar_of_Passport = values[1].substr(0, 1).toUpperCase();
    if (firstChar_of_Passport === "B" || firstChar_of_Passport === "A") {
        passport = values[1].toUpperCase();
        validatePassportNumber(passport, firstChar_of_Passport);
    } else {
        firstChar_of_Passport = "";
    }
    let country = values[0].toUpperCase();
    let itemA = passport === "" ? values[1].toUpperCase() : values[2].toUpperCase();
    let itemAQty = passport === "" ? values[2] : values[3];
    let itemB = passport === "" ? values[3].toUpperCase() : values[4].toUpperCase();
    let itemBQty = passport === "" ? values[4] : values[5];
    let masks, gloves;
    if (itemA.includes("MA")) {
        masks = itemAQty;
    } else {
        gloves = itemAQty;
    }

    if (itemB.includes("MA")) {
        masks = itemBQty;
    } else {
        gloves = itemBQty;
    }


    //fetching stock details from inventory module
    let stockDetails = inventory.inventory;

    //check if all mandatory input is provided
    if (country === undefined || itemA === undefined || itemAQty === undefined || itemB === undefined || itemBQty === undefined) {
        showError("Incomplete input parameters");
        return;
    }

    //check if qty is a number
    if (isNaN(itemAQty) || isNaN(itemBQty)) {
        showError("Invalid Quantity");
        return;
    }

    //check if input country is available in inventory
    let isCountry = stockDetails.some(stock => stock.country.toUpperCase() === country);
    if (!isCountry) {
        showError("Services in your country is currently not active");
        return;
    }

    //check if input item type is available in inventory
    let isItemA = stockDetails.some(stock => (stock.itemA_Desc.toUpperCase() === itemA || stock.itemB_Desc.toUpperCase() === itemA));
    let isItemB = stockDetails.some(stock => (stock.itemA_Desc.toUpperCase() === itemB || stock.itemB_Desc.toUpperCase() === itemB));
    if (!isItemA || !isItemB) {
        showError("The item you are looking for is currently not available in stock");
        return;
    }

    //check stock availability
    let totalMasks = Number(stockDetails[0].masks_Stock) + Number(stockDetails[1].masks_Stock);
    let totalGloves = Number(stockDetails[0].gloves_Stock) + Number(stockDetails[1].gloves_Stock);
    if (masks > totalMasks || gloves > totalGloves) {
        console.log("Out of Stock" + ":" + stockDetails[0].masks_Stock + ":" + stockDetails[1].masks_Stock + " " + stockDetails[0].gloves_Stock + ":" + stockDetails[1].gloves_Stock);
        return;
    }

    //create single object to pass argument for calculation
    let processingObj = {
        country: country,
        passportChar: firstChar_of_Passport,
        masksQty: masks,
        glovesQty: gloves
    };

    calculatePrice(processingObj);
}

//method to calcalute final selling price and remaining stock
calculatePrice = (payload) => {
    let stockDetails = inventory.inventory;
    let maskTotalPrice, glovesTotalPrice, totalPrice;
    if (payload.country === "UK" && (payload.passportChar === "B" || payload.passportChar === "")) {
        for (let i = 0; i < stockDetails.length; i++) {
            if (payload.country === stockDetails[i].country.toUpperCase()) {
                if (Number(payload.masksQty) <= Number(stockDetails[i].masks_Stock)) {
                    //logic to fulfil from UK
                    maskTotalPrice = Number(payload.masksQty) * Number(stockDetails[i].masks_Price);
                    stockDetails[i].masks_Stock = stockDetails[i].masks_Stock - payload.masksQty;
                } else {
                    //get additional stock from Germany
                    let remainingStock = Number(payload.masksQty) - Number(stockDetails[i].masks_Stock);
                    let localStockPrice = Number(payload.masksQty - remainingStock) * Number(stockDetails[i].masks_Price);
                    let outStationPrice = Number(remainingStock) * Number(stockDetails[i + 1].masks_Price);
                    let TransportationCost = Math.ceil(remainingStock / 10) * 400;
                    maskTotalPrice = localStockPrice + outStationPrice + TransportationCost;
                    stockDetails[i].masks_Stock = stockDetails[i].masks_Stock - (payload.masksQty - remainingStock);
                    stockDetails[i + 1].masks_Stock = stockDetails[i + 1].masks_Stock - remainingStock;
                }
                if (Number(payload.glovesQty) <= Number(stockDetails[i].gloves_Stock)) {
                    //logic to fulfil from UK
                    glovesTotalPrice = Number(payload.glovesQty) * Number(stockDetails[i].gloves_Price);
                    stockDetails[i].gloves_Stock = stockDetails[i].gloves_Stock - payload.glovesQty;
                } else {
                    //get additional stock from Germany
                    let remainingStock = Number(payload.glovesQty) - Number(stockDetails[i].gloves_Stock);
                    let localStockPrice = Number(payload.glovesQty - remainingStock) * Number(stockDetails[i].gloves_Price);
                    let outStationPrice = Number(remainingStock) * Number(stockDetails[i + 1].gloves_Price);
                    let TransportationCost = Math.ceil(remainingStock / 10) * 400;
                    glovesTotalPrice = localStockPrice + outStationPrice + TransportationCost;
                    stockDetails[i].gloves_Stock = stockDetails[i].gloves_Stock - (payload.glovesQty - remainingStock);
                    stockDetails[i + 1].gloves_Stock = stockDetails[i + 1].gloves_Stock - remainingStock;
                }
            }
            break;
        }
    }

    if (payload.country === "GERMANY" && (payload.passportChar === "A" || payload.passportChar === "")) {
        for (let i = 0; i < stockDetails.length; i++) {
            if (payload.country === stockDetails[i].country.toUpperCase()) {
                if (Number(payload.masksQty) <= Number(stockDetails[i].masks_Stock)) {
                    let maskTotalPriceLocal, maskTotalPriceExport, completeUnits, partialUnits;
                    completeUnits = (Number(payload.masksQty) / 10).toString().split(".")[0];
                    partialUnits = (Number(payload.masksQty) / 10).toString().split(".")[1];
                    if (partialUnits === "0" || partialUnits === undefined) {
                        maskTotalPriceLocal = Number(payload.masksQty) * Number(stockDetails[i].masks_Price);
                        maskTotalPriceExport = Number(payload.masksQty) * Number(stockDetails[i - 1].masks_Price) + (400 * completeUnits);
                        if (maskTotalPriceLocal < maskTotalPriceExport) {
                            maskTotalPrice = maskTotalPriceLocal;
                            stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(payload.masksQty);
                        } else {
                            maskTotalPrice = Number(maskTotalPriceExport);
                            stockDetails[i - 1].masks_Stock = Number(stockDetails[i - 1].masks_Stock) - Number(payload.masksQty);
                        }
                    } else {
                        if (stockDetails[0].masks_Price < stockDetails[1].masks_Price) {
                            maskTotalPriceExport = (Number(payload.masksQty) - Number(partialUnits)) * Number(stockDetails[i - 1].masks_Price) + (400 * Number(completeUnits));
                            stockDetails[i - 1].masks_Stock = Number(stockDetails[i - 1].masks_Stock) - (Number(payload.masksQty) - Number(partialUnits));
                            if (Number(partialUnits) <= 8) {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i].masks_Price);
                                stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(partialUnits);
                            } else {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i - 1].masks_Price) + 400;
                                stockDetails[i - 1].masks_Stock = Number(stockDetails[i - 1].masks_Stock) - Number(partialUnits);
                            }
                            maskTotalPrice = Number(maskTotalPriceLocal) + Number(maskTotalPriceExport);
                        } else {
                            maskTotalPrice = Number(payload.masksQty) * Number(stockDetails[i].masks_Price);
                            stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(payload.masksQty);
                        }
                    }
                }
                if (Number(payload.glovesQty) <= Number(stockDetails[i].gloves_Stock)) {
                    let maskTotalPriceLocal, maskTotalPriceExport, completeUnits, partialUnits;
                    completeUnits = (Number(payload.glovesQty) / 10).toString().split(".")[0];
                    partialUnits = (Number(payload.glovesQty) / 10).toString().split(".")[1];
                    if (partialUnits === "0" || partialUnits === undefined) {
                        maskTotalPriceLocal = Number(payload.glovesQty) * Number(stockDetails[i].gloves_Price);
                        maskTotalPriceExport = Number(payload.glovesQty) * Number(stockDetails[i - 1].gloves_Price) + (400 * completeUnits);
                        if (maskTotalPriceLocal < maskTotalPriceExport) {
                            glovesTotalPrice = Number(maskTotalPriceLocal);
                            stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(payload.glovesQty);
                        } else {
                            glovesTotalPrice = Number(maskTotalPriceExport);
                            stockDetails[i - 1].gloves_Stock = Number(stockDetails[i - 1].gloves_Stock) - Number(payload.glovesQty);
                        }
                    } else {
                        if (stockDetails[0].gloves_Price < stockDetails[1].gloves_Price) {
                            maskTotalPriceExport = (Number(payload.glovesQty) - Number(partialUnits)) * Number(stockDetails[i - 1].gloves_Price) + (400 * Number(completeUnits));
                            stockDetails[i - 1].gloves_Stock = Number(stockDetails[i - 1].gloves_Stock) - (Number(payload.glovesQty) - Number(partialUnits));
                            if (Number(partialUnits) <= 8) {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i].gloves_Price);
                                stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(partialUnits);
                            } else {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i - 1].gloves_Price) + 400;
                                stockDetails[i - 1].gloves_Stock = Number(stockDetails[i - 1].gloves_Stock) - Number(partialUnits);
                            }
                            glovesTotalPrice = Number(maskTotalPriceLocal) + Number(maskTotalPriceExport);
                        } else {
                            glovesTotalPrice = Number(payload.glovesQty) * Number(stockDetails[i].gloves_Price);
                            stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(payload.glovesQty);
                        }
                    }
                }
            }
        }
    }

    if (payload.country === "GERMANY" && payload.passportChar === "B") {
        for (let i = 0; i < stockDetails.length; i++) {
            if (payload.country === stockDetails[i].country.toUpperCase()) {
                if (Number(payload.masksQty) <= Number(stockDetails[i].masks_Stock)) {
                    let maskTotalPriceLocal, maskTotalPriceExport, completeUnits, partialUnits;
                    completeUnits = (Number(payload.masksQty) / 10).toString().split(".")[0];
                    partialUnits = (Number(payload.masksQty) / 10).toString().split(".")[1];
                    if (partialUnits === "0" || partialUnits === undefined) {
                        maskTotalPriceLocal = Number(payload.masksQty) * Number(stockDetails[i].masks_Price);
                        maskTotalPriceExport = Number(payload.masksQty) * Number(stockDetails[i - 1].masks_Price) + (320 * completeUnits);
                        if (maskTotalPriceLocal < maskTotalPriceExport) {
                            maskTotalPrice = maskTotalPriceLocal;
                            stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(payload.masksQty);
                        } else {
                            maskTotalPrice = Number(maskTotalPriceExport);
                            stockDetails[i - 1].masks_Stock = Number(stockDetails[i - 1].masks_Stock) - Number(payload.masksQty);
                        }
                    } else {
                        if (stockDetails[0].masks_Price < stockDetails[1].masks_Price) {
                            maskTotalPriceExport = (Number(payload.masksQty) - Number(partialUnits)) * Number(stockDetails[i - 1].masks_Price) + (320 * Number(completeUnits));
                            stockDetails[i - 1].masks_Stock = Number(stockDetails[i - 1].masks_Stock) - (Number(payload.masksQty) - Number(partialUnits));
                            if (Number(partialUnits) <= 8) {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i].masks_Price);
                                stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(partialUnits);
                            } else {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i - 1].masks_Price) + 320;
                                stockDetails[i - 1].masks_Stock = Number(stockDetails[i - 1].masks_Stock) - Number(partialUnits);
                            }
                            maskTotalPrice = Number(maskTotalPriceLocal) + Number(maskTotalPriceExport);
                        } else {
                            maskTotalPrice = Number(payload.masksQty) * Number(stockDetails[i].masks_Price);
                            stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(payload.masksQty);
                        }
                    }
                }
                if (Number(payload.glovesQty) <= Number(stockDetails[i].gloves_Stock)) {
                    let maskTotalPriceLocal, maskTotalPriceExport, completeUnits, partialUnits;
                    completeUnits = (Number(payload.glovesQty) / 10).toString().split(".")[0];
                    partialUnits = (Number(payload.glovesQty) / 10).toString().split(".")[1];
                    if (partialUnits === "0" || partialUnits === undefined) {
                        maskTotalPriceLocal = Number(payload.glovesQty) * Number(stockDetails[i].gloves_Price);
                        maskTotalPriceExport = Number(payload.glovesQty) * Number(stockDetails[i - 1].gloves_Price) + (320 * completeUnits);
                        if (maskTotalPriceLocal < maskTotalPriceExport) {
                            glovesTotalPrice = Number(maskTotalPriceLocal);
                            stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(payload.glovesQty);
                        } else {
                            glovesTotalPrice = Number(maskTotalPriceExport);
                            stockDetails[i - 1].gloves_Stock = Number(stockDetails[i - 1].gloves_Stock) - Number(payload.glovesQty);
                        }
                    } else {
                        if (stockDetails[0].gloves_Price < stockDetails[1].gloves_Price) {
                            maskTotalPriceExport = (Number(payload.glovesQty) - Number(partialUnits)) * Number(stockDetails[i - 1].gloves_Price) + (320 * Number(completeUnits));
                            stockDetails[i - 1].gloves_Stock = Number(stockDetails[i - 1].gloves_Stock) - (Number(payload.glovesQty) - Number(partialUnits));
                            if (Number(partialUnits) <= 8) {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i].gloves_Price);
                                stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(partialUnits);
                            } else {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i - 1].gloves_Price) + 320;
                                stockDetails[i - 1].gloves_Stock = Number(stockDetails[i - 1].gloves_Stock) - Number(partialUnits);
                            }
                            glovesTotalPrice = Number(maskTotalPriceLocal) + Number(maskTotalPriceExport);
                        } else {
                            glovesTotalPrice = Number(payload.glovesQty) * Number(stockDetails[i].gloves_Price);
                            stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(payload.glovesQty);
                        }
                    }
                }
            }
        }
    }

    if (payload.country === "UK" && payload.passportChar === "A") {
        for (let i = 0; i < stockDetails.length; i++) {
            if (payload.country === stockDetails[i].country.toUpperCase()) {
                if (Number(payload.masksQty) <= Number(stockDetails[i].masks_Stock)) {
                    let maskTotalPriceLocal, maskTotalPriceExport, completeUnits, partialUnits;
                    completeUnits = (Number(payload.masksQty) / 10).toString().split(".")[0];
                    partialUnits = (Number(payload.masksQty) / 10).toString().split(".")[1];
                    if (partialUnits === "0" || partialUnits === undefined) {
                        maskTotalPriceLocal = Number(payload.masksQty) * Number(stockDetails[i].masks_Price);
                        maskTotalPriceExport = Number(payload.masksQty) * Number(stockDetails[i + 1].masks_Price) + (320 * completeUnits);
                        if (maskTotalPriceLocal < maskTotalPriceExport) {
                            maskTotalPrice = maskTotalPriceLocal;
                            stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(payload.masksQty);
                        } else {
                            maskTotalPrice = Number(maskTotalPriceExport);
                            stockDetails[i - 1].masks_Stock = Number(stockDetails[i - 1].masks_Stock) - Number(payload.masksQty);
                        }
                    } else {
                        if (stockDetails[0].masks_Price < stockDetails[1].masks_Price) {
                            maskTotalPriceExport = (Number(payload.masksQty) - Number(partialUnits)) * Number(stockDetails[i + 1].masks_Price) + (320 * Number(completeUnits));
                            stockDetails[i + 1].masks_Stock = Number(stockDetails[i + 1].masks_Stock) - (Number(payload.masksQty) - Number(partialUnits));
                            if (Number(partialUnits) <= 8) {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i].masks_Price);
                                stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(partialUnits);
                            } else {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i + 1].masks_Price) + 320;
                                stockDetails[i + 1].masks_Stock = Number(stockDetails[i + 1].masks_Stock) - Number(partialUnits);
                            }
                            maskTotalPrice = Number(maskTotalPriceLocal) + Number(maskTotalPriceExport);
                        } else {
                            maskTotalPrice = Number(payload.masksQty) * Number(stockDetails[i].masks_Price);
                            stockDetails[i].masks_Stock = Number(stockDetails[i].masks_Stock) - Number(payload.masksQty);
                        }
                    }
                } else {
                    let localmaskPrice, exportmaskPrice, balanceQty, remainingUnits;
                    remainingUnits = Math.ceil(balanceQty / 10);
                    balanceQty = Number(payload.masksQty) - Number(stockDetails[i].masks_Stock);
                    localmaskPrice = Number(stockDetails[i].masks_Stock) * Number(stockDetails[i].masks_Price);
                    exportmaskPrice = Number(stockDetails[i + 1].masks_Price) * balanceQty + (320 * remainingUnits);
                    maskTotalPrice = Number(localmaskPrice) + Number(exportmaskPrice);
                    stockDetails[i].masks_Stock = Number("0");
                    stockDetails[i + 1].masks_Stock = Number(stockDetails[i + 1].masks_Stock) - Number(balanceQty);
                }
                if (Number(payload.glovesQty) <= Number(stockDetails[i].gloves_Stock)) {
                    let maskTotalPriceLocal, maskTotalPriceExport, completeUnits, partialUnits;
                    completeUnits = (Number(payload.glovesQty) / 10).toString().split(".")[0];
                    partialUnits = (Number(payload.glovesQty) / 10).toString().split(".")[1];
                    if (partialUnits === "0") {
                        maskTotalPriceLocal = Number(payload.glovesQty) * Number(stockDetails[i].gloves_Price);
                        maskTotalPriceExport = Number(payload.glovesQty) * Number(stockDetails[i + 1].gloves_Price) + (320 * completeUnits);
                        if (maskTotalPriceLocal < maskTotalPriceExport) {
                            glovesTotalPrice = Number(maskTotalPriceLocal);
                            stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(payload.glovesQty);
                        } else {
                            glovesTotalPrice = Number(maskTotalPriceExport);
                            stockDetails[i + 1].gloves_Stock = Number(stockDetails[i + 1].gloves_Stock) - Number(payload.glovesQty);
                        }
                    } else {
                        if (stockDetails[0].gloves_Price < stockDetails[1].gloves_Price) {
                            maskTotalPriceExport = (Number(payload.glovesQty) - Number(partialUnits)) * Number(stockDetails[i + 1].gloves_Price) + (320 * Number(completeUnits));
                            stockDetails[i + 1].gloves_Stock = Number(stockDetails[i + 1].gloves_Stock) - (Number(payload.glovesQty) - Number(partialUnits));
                            if (Number(partialUnits) <= 8) {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i].gloves_Price);
                                stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(partialUnits);
                            } else {
                                maskTotalPriceLocal = Number(partialUnits) * Number(stockDetails[i + 1].gloves_Price) + 320;
                                stockDetails[i + 1].gloves_Stock = Number(stockDetails[i + 1].gloves_Stock) - Number(partialUnits);
                            }
                            glovesTotalPrice = Number(maskTotalPriceLocal) + Number(maskTotalPriceExport);
                        } else {
                            glovesTotalPrice = Number(payload.glovesQty) * Number(stockDetails[i].gloves_Price);
                            stockDetails[i].gloves_Stock = Number(stockDetails[i].gloves_Stock) - Number(payload.glovesQty);
                        }
                    }
                } else {
                    let localmaskPrice, exportmaskPrice, balanceQty, remainingUnits;
                    remainingUnits = Math.ceil(balanceQty / 10);
                    balanceQty = Number(payload.glovesQty) - Number(stockDetails[i].gloves_Stock);
                    localmaskPrice = Number(stockDetails[i].gloves_Stock) * Number(stockDetails[i].gloves_Price);
                    exportmaskPrice = Number(stockDetails[i + 1].gloves_Price) * balanceQty + (320 * remainingUnits);
                    glovesTotalPrice = Number(localmaskPrice) + Number(exportmaskPrice);
                    stockDetails[i].gloves_Stock = Number("0");
                    stockDetails[i + 1].gloves_Stock = Number(stockDetails[i + 1].gloves_Stock) - Number(balanceQty);
                }
            }
        }
    }

    totalPrice = maskTotalPrice + glovesTotalPrice;
    console.log(totalPrice + ":" + stockDetails[0].masks_Stock + ":" + stockDetails[1].masks_Stock + " " + stockDetails[0].gloves_Stock + ":" + stockDetails[1].gloves_Stock);

}

//check if user passport number is valid
validatePassportNumber = (passport, passportCharacter) => {
    if (passportCharacter !== "B" && passportCharacter !== "A") {
        showError("Invalid Passport!");
        return;
    }
    if (passportCharacter === "B") {
        if (passport.length !== 13) {
            showError("Passport number invalid!");
            return;
        } else {
            if (isNaN(passport.substr(1, 3))) {
                showError("Passport number invalid!");
                return;
            }
            if (!isNaN(passport.substr(4, 2))) {
                showError("Passport number invalid!");
                return;
            }
            let format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
            if (format.test(passport.substr(6, 12))) {
                showError("Passport number invalid!");
                return;
            }
        }
    }
    if (passportCharacter === "A") {
        if (passport.length !== 12) {
            showError("Passport number invalid!");
            return;
        } else {
            if (!isNaN(passport.substr(1, 2))) {
                showError("Passport number invalid!");
                return;
            }
            let format = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
            if (format.test(passport.substr(3, 9))) {
                showError("Passport number invalid!");
                return;
            }
        }
    }

}

//export modules for accessibility
module.exports = {
    showError,
    processUserInput,
    validateUserInput
};