
'use strict';

var PixelItem = function (text) {
    if (text) {
        var o = JSON.parse(text);
        this.color = o.color;
    } else {
        this.color = "";
    }
};

PixelItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var PlaceContract = function () {
    LocalContractStorage.defineMapProperty(this, "pixelRepo", {
        parse: function (text) {
            return new DepositeContent(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
};

PlaceContract.prototype = {
    init: function () {},

    save: function (text) {
        this.pixelRepo.put();
    },

    get: function (value) {

    }
};

module.exports = PlaceContract;