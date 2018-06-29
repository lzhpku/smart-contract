"use strict";

var ArrangementContract = function () {
    LocalContractStorage.defineMapProperty(this, "userRepo", null);
    LocalContractStorage.defineProperty(this, "userSize", null);
    LocalContractStorage.defineMapProperty(this, "userIdMap", null);
    LocalContractStorage.defineMapProperty(this, "arrangementRepo", null);
    LocalContractStorage.defineProperty(this, "arrangementSize", null);
    LocalContractStorage.defineMapProperty(this, "orderRepo", null);

    LocalContractStorage.defineProperty(this, "adminAddress", null);
};

ArrangementContract.prototype = {
    init: function () {
        this.userSize = 0;
        this.arrangementSize = 0;
        this.adminAddress = "n1PMUxrXSuHQcDRLRHLTrokqQHtDUXdXE9r";
    },

    saveArrangement: function (
        title,
        nick,
        sex,
        age,
        address,
        profession,
        pic1,
        pic2,
        pic3,
        description,
        price,
        arrangementId) {

        if (isNaN(Number(price))) {
            var errorItem = {
                "code": 100,
                "message": "can not convert price to digit"
            };
            return errorItem;
        }

        var from = Blockchain.transaction.from;
        if (arrangementId) {
            var arrangement = this.arrangementRepo.get(arrangementId);
            if (!arrangement) {
                var errorItem = {
                    "code": 200,
                    "message": "arrangement is not found"
                };
                return errorItem;
            }
            if (arrangement["author"] != from) {
                var errorItem = {
                    "code": 300,
                    "message": "permission denied"
                };
                return errorItem;
            }
        }

        var arrangement = this.arrangementRepo.get(arrangementId);
        if (!arrangement) {
            arrangementId = this.arrangementSize;
            this.arrangementSize += 1;
            arrangement = {
                "author": from,
                "title": title,
                "nick": nick,
                "sex": sex,
                "age": age,
                "address": address,
                "profession": profession,
                "pic1": pic1,
                "pic2": pic2,
                "pic3": pic3,
                "description": description,
                "price": parseFloat(price),
                "orderedCount": 0,
                "paidCount": 0,
                "status": 0,
                "createTime": new Date().getTime(),
                "arrangementId": arrangementId
            };
        } else {
            arrangement["title"] = title;
            arrangement["nick"] = nick;
            arrangement["sex"] = sex;
            arrangement["age"] = age;
            arrangement["address"] = address;
            arrangement["profession"] = profession;
            arrangement["pic1"] = pic1;
            arrangement["pic2"] = pic2;
            arrangement["pic3"] = pic3;
            arrangement["description"] = description;
            arrangement["price"] = parseFloat(price);
        }
        this.arrangementRepo.set(arrangementId, arrangement);

        var user = this.userRepo.get(from);
        if (!user) {
            var userId = this.userSize;
            this.userSize += 1;
            this.userIdMap.set(userId, from);
            var user = {
                "arrangementIds": [],
                "owned": [],
                "ordered": [],
            };
        }
        user['arrangementIds'].push(arrangementId);
        this.userRepo.set(from, user);
    },

    applyArrangement: function (arrangementId, contract, description) {
        var from = Blockchain.transaction.from;
        var arrangement = this.arrangementRepo.get(arrangementId);
        if (!arrangement) {
            var errorItem = {
                "code": 200,
                "message": "arrangement is not found"
            };
            return errorItem;
        }
        var value = Blockchain.transaction.value.dividedBy(1000000000000000000).toNumber();
        var price = parseFloat(arrangement["price"]);
        if (value < price) {
            Blockchain.transfer(this.adminAddress, value * 1000000000000000000);
            var errorItem = {
                "code": 301,
                "message": "insufficient balance"
            };
            return errorItem;
        }

        var orderId = arrangementId + "@@@" + arrangement['orderedCount'].toString();
        var order = {
            "arrangementId" : arrangementId,
            "orderId" : orderId,
            "user": from,
            "createTime": new Date().getTime(),
            "price" : arrangement['price'],
            "title" : arrangement['title'],
            "contract" : contract,
            "description" : description,
            "status" : 0, // 0 用户已申请，1 发布者已确认，2 发布者/用户已取消，3 用户确认付款
            "operation" : true,
        }
        this.orderRepo.set(orderId, order);

        arrangement['orderedCount'] += 1;
        this.arrangementRepo.set(arrangementId, arrangement);

        var promulgator = this.userRepo.get(arrangement['author']);
        promulgator['owned'].push(orderId);
        this.userRepo.set(arrangement['author'], promulgator);

        var user = this.userRepo.get(from);
        if (!user) {
            var userId = this.userSize.toString();
            this.userSize += 1;
            this.userIdMap.set(userId, from);
            user = {
                "owned": [],
                "ordered": [],
            }
        }
        user["ordered"].push(orderId);
        this.userRepo.set(from, user);
    },

    promulgatorComfirm: function (orderId) {
        var order = this.orderRepo.get(orderId);
        if (!order) {
            var errorItem = {
                "code" : 201,
                "message" : "order is not found",
            }
            return errorItem;
        }
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            var errorItem = {
                "code": 202,
                "message": "user is not found"
            };
            return errorItem;
        }
        for (var index in user["owned"]) {
            if (orderId == user["owned"][index]) {
                if (order["status"] == 0) {
                    order["status"] = 1;
                    this.orderRepo.set(orderId, order);
                    return;
                } else {
                    var errorItem = {
                        "code": 400,
                        "message": "invalid operation",
                    };
                    return errorItem;
                }
            }
        }
        var errorItem = {
            "code": 500,
            "message": "the promulgator does not own this order",
        };
        return errorItem;
    },

    promulgatorCancel: function (orderId) {
        var order = this.orderRepo.get(orderId);
        if (!order) {
            var errorItem = {
                "code": 201,
                "message": "order is not found",
            }
            return errorItem;
        }
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            var errorItem = {
                "code": 202,
                "message": "user is not found"
            };
            return errorItem;
        }
        for (var index in user["owned"]) {
            if (orderId == user["owned"][index]) {
                if (order["status"] == 0) {
                    var arrangement = this.arrangementRepo.get(order["arrangementId"]);
                    var flag = Blockchain.transfer(order["user"], arrangement["price"] * 1000000000000000000);
                    if (flag == true) {
                        arrangement["orderedCount"] -= 1;
                        if (arrangement["orderedCount"] <= 0) {
                            arrangement["orderedCount"] = 0;
                        }
                        this.arrangementRepo.set(order["arrangementId"], arrangement);
                        order["status"] = 2;
                        this.orderRepo.set(orderId, order);
                        return;
                    }
                    var errorItem = {
                        "code": 300,
                        "message": "insufficient balance",
                    };
                    return errorItem;
                } else {
                    var errorItem = {
                        "code": 400,
                        "message": "invalid operation",
                    };
                    return errorItem;
                }
            }
        }
        var errorItem = {
            "code": 500,
            "message": "the promulgator does not own this order",
        };
        return errorItem;
    },

    userComfirm: function (orderId) {
        var order = this.orderRepo.get(orderId);
        if (!order) {
            var errorItem = {
                "code": 201,
                "message": "order is not found",
            }
            return errorItem;
        }
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            var errorItem = {
                "code": 202,
                "message": "user is not found"
            };
            return errorItem;
        }
        for (var index in user["ordered"]) {
            if (orderId == user["ordered"][index]) {
                if (order["status"] == 1) {
                    var arrangement = this.arrangementRepo.get(order["arrangementId"]);
                    var flag = Blockchain.transfer(arrangement["author"], arrangement["price"] * 1000000000000000000);
                    if (flag == true) {
                        arrangement["paidCount"] += 1;
                        arrangement["orderedCount"] -= 1;
                        if (arrangement["orderedCount"] <= 0) {
                            arrangement["orderedCount"] = 0;
                        }
                        this.arrangementRepo.set(order["arrangementId"], arrangement);
                        order["status"] = 3;
                        this.orderRepo.set(orderId, order);
                        return;
                    }
                    var errorItem = {
                        "code": 300,
                        "message": "insufficient balance",
                    };
                    return errorItem;
                } else {
                    var errorItem = {
                        "code": 400,
                        "message": "invalid operation",
                    };
                    return errorItem;
                }
            }
        }
        var errorItem = {
            "code": 501,
            "message": "the user does not apply this order",
        };
        return errorItem;
    },

    userCancel: function (orderId) {
        var order = this.orderRepo.get(orderId);
        if (!order) {
            var errorItem = {
                "code": 201,
                "message": "order is not found",
            }
            return errorItem;
        }
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            var errorItem = {
                "code": 202,
                "message": "user is not found"
            };
            return errorItem;
        }
        for (var index in user["ordered"]) {
            if (orderId == user["ordered"][index]) {
                if (order["status"] == 1) {
                    var arrangement = this.arrangementRepo.get(order["arrangementId"]);
                    var flag = Blockchain.transfer(from, arrangement["price"] * 1000000000000000000);
                    if (flag == true) {
                        arrangement["orderedCount"] -= 1;
                        if (arrangement["orderedCount"] <= 0) {
                            arrangement["orderedCount"] = 0;
                        }
                        this.arrangementRepo.set(order["arrangementId"], arrangement);
                        order["status"] = 2;
                        this.orderRepo.set(orderId, order);
                        return;
                    }
                    var errorItem = {
                        "code": 300,
                        "message": "insufficient balance",
                    };
                    return errorItem;
                } else {
                    var errorItem = {
                        "code": 400,
                        "message": "invalid operation",
                    };
                    return errorItem;
                }
            }
        }
        var errorItem = {
            "code": 501,
            "message": "the user does not apply this order",
        };
        return errorItem;
    },

    getUserInfo: function (from) {
        return this.userRepo.get(from);
    },

    getArrangementList: function (limit, offset) {
        var limitNum = parseInt(limit);
        var offsetNum = parseInt(offset);
        if (offsetNum > this.arrangementSize) {
            var errorItem = {
                "code": 101,
                "message": "offset is invalid"
            };
            return errorItem;
        }
        var number = offsetNum + limitNum;
        if (number > this.arrangementSize) {
            number = this.arrangementSize;
        }

        var from = Blockchain.transaction.from;

        var list = [];
        for (var i = offsetNum; i < number; i ++) {
            var arrangement = this.arrangementRepo.get(i);
            if (!arrangement) {
                continue;
            }

            if (from == arrangement["author"]) {
                arrangement["status"] = 0; //拥有
            } else {
                arrangement["status"] = 1; //访问
            }

            list.push(arrangement);
        }
        return list;
    },

    getArrangement: function (arrangementId) {
        var from = Blockchain.transaction.from;
        var arrangement = this.arrangementRepo.get(arrangementId);
        if (!arrangement) {
            var errorItem = {
                "code": 200,
                "message": "arrangement is not found"
            };
            return errorItem;
        }
        if (from == arrangement["author"]) {
            arrangement["status"] = 0; //拥有
        } else {
            arrangement["status"] = 1; //访问
        }
        return arrangement;
    },

    getUserOrderList: function (status) {
        if (isNaN(Number(status))) {
            var errorItem = {
                "code": 100,
                "message": "can not convert status to digit"
            };
            return errorItem;
        }

        var list = [];
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            return list;
        }
        for (var index in user["owned"]) {
            var order = this.orderRepo.get(user["owned"][index]);
            if (!order || order['status'] != status) {
                continue;
            }
            if (status == 0) {
                order['operation'] = true;
            } else {
                order['operation'] = false;
            }
            list.push(order);
        }
        for (var index in user["ordered"]) {
            var order = this.orderRepo.get(user["ordered"][index]);
            if (!order || order['status'] != status) {
                continue;
            }
            if (status == 1) {
                order['operation'] = true;
            } else {
                order['operation'] = false;
            }
            list.push(order);
        }
        return list;
    },

    modify: function(arrangementId, key, value) {
        var from = Blockchain.transaction.from
        if (from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        var arrangement = this.arrangementRepo.get(arrangementId);
        if (!arrangement) {
            var errorItem = {
                "code": 200,
                "message": "arrangement is not found"
            };
            return errorItem;
        }
        arrangement[key] = value;
        this.arrangementRepo.set(arrangementId, arrangement);
    },

    deleteArrangement: function(arrangementId) {
        var from = Blockchain.transaction.from
        if (from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        var arrangementLastId = this.arrangementSize - 1;
        this.arrangementSize -= 1;

        var arrangement = this.arrangementRepo.get(arrangementLastId);
        if (!arrangement) {
            var errorItem = {
                "code": 200,
                "message": "arrangement is not found"
            };
            return errorItem;
        }
        this.arrangementRepo.set(arrangementId, arrangement);
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

module.exports = ArrangementContract;

// saveArrangement: function (title, nick, sex, age, address, profession, pic1, pic2, pic3, description, price,
// arrangementId)
// 存储约会信息：标题，昵称，性别，年龄，所在地区，工作职业，照片1，照片2，照片3，约会内容描述，约会基金额度，约会信息ID
// applyArrangement: function (arrangementId, contract, description)
// 创建约会心愿单：约会信息ID，联系方式，自我介绍
// promulgatorComfirm: function (orderId)
// 发起人确认约会：约会信息ID
// promulgatorCancel: function (orderId)
// 发起人取消约会：约会信息ID
// userComfirm: function (orderId)
// 用户确认约会：约会信息ID
// userCancel: function (orderId)
// 用户确认约会：约会信息ID
// getArrangementList: function (limit, offset)
// 获得约会信息列表：每页数量，偏移量
// getArrangement: function (arrangementId)
// 获取约会信息内容：约会信息ID
// getUserOrderList: function (status)
// 获得约会心愿单列表：心愿单状态
// modify: function(arrangementId, key, value)
// 管理员修改约会信息属性：约会信息ID，键，值
// deleteArrangement: function(arrangementId)
// 管理员删除约会信息：约会信息ID
