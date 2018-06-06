"use strict";

var HouseContract = function () {
    LocalContractStorage.defineMapProperty(this, "userRepo", null);
    LocalContractStorage.defineProperty(this, "userSize", null);
    LocalContractStorage.defineMapProperty(this, "userIdMap", null);
    LocalContractStorage.defineMapProperty(this, "houseRepo", null);
    LocalContractStorage.defineProperty(this, "houseSize", null);

    LocalContractStorage.defineProperty(this, "adminAddress", null);
};

HouseContract.prototype = {
    init: function () {
        this.userSize = 0;
        this.houseSize = 0;
        this.adminAddress = "n1PMUxrXSuHQcDRLRHLTrokqQHtDUXdXE9r";
    },

    saveHouse: function (title,
                         tel,
                         email,
                         housePrice,
                         address,
                         area,
                         houseType,
                         sellType,
                         usage,
                         description,
                         pic1,
                         pic2,
                         pic3,
                         price,
                         houseId) {
        if (isNaN(Number(price))) {
            var errorItem = {
                "code": 6,
                "message": "can not convert price to digit"
            };
            return errorItem;
        }

        var from = Blockchain.transaction.from;
        if (houseId) {
            var house = this.houseRepo.get(houseId);
            if (!house) {
                var errorItem = {
                    "code": 4,
                    "message": "house is not defined"
                };
                return errorItem;
            }
            if (house["author"] != from) {
                var errorItem = {
                    "code": 5,
                    "message": "permission denied"
                };
                return errorItem;
            }
        }

        title = title.trim();
        tel = tel.trim();
        email = email.trim();
        housePrice = housePrice.trim();
        address = address.trim();
        area = area.trim();
        houseType = houseType.trim();
        sellType = sellType.trim();
        usage = usage.trim();
        description = description.trim();
        pic1 = pic1.trim();
        pic2 = pic2.trim();
        pic3 = pic3.trim();

        var house = this.houseRepo.get(houseId);
        if (!house) {
            houseId = this.houseSize;
            this.houseSize += 1;
            house = {
                "author": from,
                "title": title,
                "tel": tel,
                "email": email,
                "housePrice": housePrice,
                "address": address,
                "area": area,
                "houseType": houseType,
                "sellType": sellType,
                "usage": usage,
                "description": description,
                "pic1": pic1,
                "pic2": pic2,
                "pic3": pic3,
                "price": parseFloat(price),
                "createTime": new Date().getTime(),
                "paidCount": 0,
                "status": 0, // 0已拥有，1已购买，2未购买
                "houseId": houseId
            };
        } else {
            house["title"] = title;
            house["tel"] = tel;
            house["email"] = email;
            house["housePrice"] = housePrice;
            house["address"] = address;
            house["area"] = area;
            house["houseType"] = houseType;
            house["sellType"] = sellType;
            house["usage"] = usage;
            house["description"] = description;
            house["pic1"] = pic1;
            house["pic2"] = pic2;
            house["pic3"] = pic3;
            house["price"] = parseFloat(price);
        }
        this.houseRepo.set(houseId, house);

        var user = this.userRepo.get(from);
        if (!user) {
            var userId = this.userSize;
            this.userSize += 1;
            this.userIdMap.set(userId, from);
            var user = {
                "owned": [houseId],
                "paid": []
            };
        } else {
            user["owned"].push(houseId);
        }
        this.userRepo.set(from, user);
    },

    checkHouse: function (houseId) {
        var house = this.houseRepo.get(houseId);
        if (!house) {
            var errorItem = {
                "code": 1,
                "message": "houseId is not found"
            };
            return errorItem;
        }
        var value = Blockchain.transaction.value.dividedBy(1000000000000000000).toNumber();
        var price = parseFloat(house["price"]);
        if (value < price) {
            Blockchain.transfer(this.adminAddress, value * 1000000000000000000);
            var errorItem = {
                "code": 2,
                "message": "insufficient balance"
            };
            return errorItem;
        }
        var flag = Blockchain.transfer(house["author"], price * 1000000000000000000);
        if (flag == true) {
            var from = Blockchain.transaction.from;
            var user = this.userRepo.get(from);
            if (!user) {
                var userId = this.userSize.toString();
                this.userSize += 1;
                this.userIdMap.set(userId, from);
                user = {
                    "owned": [],
                    "paid": []
                }
            }
            user["paid"].push(houseId);
            this.userRepo.set(from, user);

            house["paidCount"] += 1;
            this.houseRepo.set(houseId, house);

            var successItem = {
                "code": "0",
                "message": "check succeeded"
            };
            return successItem;
        }
        return null;
    },

    getHouseList: function (limit, offset) {
        var limitNum = parseInt(limit);
        var offsetNum = parseInt(offset);
        if (offsetNum > this.houseSize) {
            var errorItem = {
                "code": 3,
                "message": "offset if invalid"
            };
            return errorItem;
        }
        var number = offsetNum + limitNum;
        if (number > this.houseSize) {
            number = this.houseSize;
        }

        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);

        var list = [];
        for (var i = offsetNum; i < number; i ++) {
            var house = this.houseRepo.get(i);
            house["tel"] = "***";
            house["email"] = "***";
            if (from == house["author"]) {
                house["status"] = 0; //已拥有
            } else {
                house["status"] = 2; //未购买
            }

            if (user) {
                for (var index in user["paid"]) {
                    if (house["author"] == user["paid"][index]) {
                        house["status"] = 1; //已购买
                    }
                }
            }
            list.push(house);
        }
        return list;
    },

    getUserOwnedHouseList: function () {
        var list = [];
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            return list;
        }
        for (var index in user["owned"]) {
            var house = this.houseRepo.get(user["owned"][index]);
            house["tel"] = "***";
            house["email"] = "***";
            house["status"] = 0;
            list.push(house);
        }
        return list;
    },

    getUserPaidHouseList: function () {
        var list = [];
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            return list;
        }
        for (var index in user["paid"]) {
            var house = this.houseRepo.get(user["paid"][index]);
            house["tel"] = "***";
            house["email"] = "***";
            house["status"] = 1;
            list.push(house);
        }
        return list;
    },

    getHouse: function (houseId) {
        var from = Blockchain.transaction.from
        var house = this.houseRepo.get(houseId);
        if (!house) {
            return null;
        }
        var tel = house["tel"];
        var email = house["email"];
        house["tel"] = "***";
        house["email"] = "***";

        if (house["author"] == from) {
            house["tel"] = tel;
            house["email"] = email;
            house["status"] = 0;
        } else {
            house["status"] = 2;
        }

        var user = this.userRepo.get(from);
        if (user) {
            for (var index in user["paid"]) {
                if (houseId == user["paid"][index]) {
                    house["tel"] = tel;
                    house["email"] = email;
                    house["status"] = 1;
                }
            }
        }

        return house;
    },

    withdraw: function(address, value) {
        var from = Blockchain.transaction.from
        if (from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        var result = Blockchain.transfer(address, parseFloat(value) * 1000000000000000000);
        return result;
    }
};

module.exports = HouseContract;

// saveResume: function (name, target, phone, email, profile, education, project, skill, price, houseId)
// 存储简历信息：姓名，目标职位，电话，邮箱，简介，教育背景，项目经历，职业技能，定价，简历ID
// checkResume: function (houseId)
// 支付查看简历：简历ID
// getResumeList: function (limit, offset)
// 获得简历列表：每页数量，偏移量
// getUserOwnedResumeList: function ()
// 查看用户拥有的简历
// getUserPaidResumeList: function ()
// 查看用户支付的简历
// getResume: function (houseId)
// 获取简历内容：简历ID
