"use strict";

var FriendContract = function () {
    LocalContractStorage.defineMapProperty(this, "userRepo", null);
    LocalContractStorage.defineProperty(this, "userSize", null);
    LocalContractStorage.defineMapProperty(this, "userIdMap", null);
    LocalContractStorage.defineMapProperty(this, "friendRepo", null);
    LocalContractStorage.defineProperty(this, "friendSize", null);

    LocalContractStorage.defineProperty(this, "adminAddress", null);
};

FriendContract.prototype = {
    init: function () {
        this.userSize = 0;
        this.friendSize = 0;
        this.adminAddress = "n1PMUxrXSuHQcDRLRHLTrokqQHtDUXdXE9r";
    },

    saveFriend: function (title,
                         nick,
                         sex,
                         age,
                         tel,
                         wechat,
                         address,
                         profession,
                         hobby,
                         pic1,
                         pic2,
                         pic3,
                         description,
                         price,
                         friendId) {
        if (isNaN(Number(price))) {
            var errorItem = {
                "code": 6,
                "message": "can not convert price to digit"
            };
            return errorItem;
        }

        var from = Blockchain.transaction.from;
        if (friendId) {
            var friend = this.friendRepo.get(friendId);
            if (!friend) {
                var errorItem = {
                    "code": 4,
                    "message": "friend is not defined"
                };
                return errorItem;
            }
            if (friend["author"] != from) {
                var errorItem = {
                    "code": 5,
                    "message": "permission denied"
                };
                return errorItem;
            }
        }

        var friend = this.friendRepo.get(friendId);
        if (!friend) {
            friendId = this.friendSize;
            this.friendSize += 1;
            friend = {
                "author": from,
                "title": title,
                "nick": nick,
                "sex": sex,
                "age": age,
                "tel": tel,
                "wechat": wechat,
                "address": address,
                "profession": profession,
                "hobby": hobby,
                "pic1": pic1,
                "pic2": pic2,
                "pic3": pic3,
                "description": description,
                "price": parseFloat(price),
                "createTime": new Date().getTime(),
                "paidCount": 0,
                "fondCount": 0,
                "status": 0, // 0已拥有，1已购买，2未购买
                "friendId": friendId
            };
        } else {
            friend["title"] = title;
            friend["nick"] = nick;
            friend["sex"] = sex;
            friend["age"] = age;
            friend["tel"] = tel;
            friend["wechat"] = wechat;
            friend["address"] = address;
            friend["profession"] = profession;
            friend["hobby"] = hobby;
            friend["pic1"] = pic1;
            friend["pic2"] = pic2;
            friend["pic3"] = pic3;
            friend["description"] = description;
            friend["price"] = parseFloat(price);
        }
        this.friendRepo.set(friendId, friend);

        var user = this.userRepo.get(from);
        if (!user) {
            var userId = this.userSize;
            this.userSize += 1;
            this.userIdMap.set(userId, from);
            var user = {
                "owned": [friendId],
                "paid": [],
                "fond": []
            };
        } else {
            user["owned"].push(friendId);
        }
        this.userRepo.set(from, user);
    },

    checkFriend: function (friendId) {
        var friend = this.friendRepo.get(friendId);
        if (!friend) {
            var errorItem = {
                "code": 1,
                "message": "friendId is not found"
            };
            return errorItem;
        }
        var value = Blockchain.transaction.value.dividedBy(1000000000000000000).toNumber();
        var price = parseFloat(friend["price"]);
        if (value < price) {
            Blockchain.transfer(this.adminAddress, value * 1000000000000000000);
            var errorItem = {
                "code": 2,
                "message": "insufficient balance"
            };
            return errorItem;
        }
        var flag = Blockchain.transfer(friend["author"], price * 1000000000000000000);
        if (flag == true) {
            var from = Blockchain.transaction.from;
            var user = this.userRepo.get(from);
            if (!user) {
                var userId = this.userSize.toString();
                this.userSize += 1;
                this.userIdMap.set(userId, from);
                user = {
                    "owned": [],
                    "paid": [],
                    "fond": []
                }
            }
            user["paid"].push(friend['author']);
            user["fond"].push(friend['author']);
            this.userRepo.set(from, user);

            friend["paidCount"] += 1;
            friend["fondCount"] += 1;
            this.friendRepo.set(friendId, friend);

            this._checkMutual(friend['author'], from);

            var successItem = {
                "code": "0",
                "message": "check succeeded"
            };
            return successItem;
        }
        return null;
    },

    fondFriend: function (friendId) {
        var from = Blockchain.transaction.from;
        var friend = this.friendRepo.get(friendId);
        if (!friend) {
            var errorItem = {
                "code": 1,
                "message": "friendId is not found"
            };
            return errorItem;
        }
        var value = Blockchain.transaction.value.dividedBy(1000000000000000000).toNumber();
        var flag = false;
        if (value == 0) {
            flag = true;
        } else {
            flag = Blockchain.transfer(friend["author"], value * 1000000000000000000);
        }
        if (flag == true) {
            var user = this.userRepo.get(from);
            if (!user) {
                var userId = this.userSize.toString();
                this.userSize += 1;
                this.userIdMap.set(userId, from);
                user = {
                    "owned": [],
                    "paid": [],
                    "fond": []
                }
            }
            user["fond"].push(friend['author']);
            this.userRepo.set(from, user);

            friend["fondCount"] += 1;
            this.friendRepo.set(friendId, friend);

            this._checkMutual(friend['author'], from);
        }
    },

    _checkMutual: function (friendAuthor, from) {
        var friend = this.userRepo.get(friendAuthor);
        if (!friend) {
            var errorItem = {
                "code": 1,
                "message": "friendId is not found"
            };
            return errorItem;
        }
        for (var index in friend["fond"]) {
            if (from == friend["fond"][index]) {
                var user = this.userRepo.get(from);
                user["paid"].push(friendAuthor);
                this.userRepo.set(from, user);
                friend["paid"].push(from);
                this.userRepo.set(friendAuthor, friend);
                break;
            }
        }
    },

    getUserInfo: function (from) {
        return this.userRepo.get(from);
    },

    getFriendList: function (limit, offset, sex) {
        var limitNum = parseInt(limit);
        var offsetNum = parseInt(offset);
        if (offsetNum > this.friendSize) {
            var errorItem = {
                "code": 3,
                "message": "offset if invalid"
            };
            return errorItem;
        }
        var number = offsetNum + limitNum;
        if (number > this.friendSize) {
            number = this.friendSize;
        }

        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);

        var list = [];
        for (var i = offsetNum; i < number; i ++) {
            var friend = this.friendRepo.get(i);
            if (!friend) {
                continue;
            }
            friend["tel"] = "***";
            friend["wechat"] = "***";
            if (from == friend["author"]) {
                friend["status"] = 0; //已拥有
            } else {
                friend["status"] = 2; //未购买
            }

            if (user) {
                for (var index in user["paid"]) {
                    if (friend["author"] == user["paid"][index]) {
                        friend["status"] = 1; //已购买
                    }
                }
            }

            if (friend['sex'] == sex) {
                list.push(friend);
            }
        }
        return list;
    },

    getUserOwnedFriendList: function () {
        var list = [];
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            return list;
        }
        for (var index in user["owned"]) {
            var friend = this.friendRepo.get(user["owned"][index]);
            if (!friend) {
                continue;
            }
            friend["tel"] = "***";
            friend["wechat"] = "***";
            friend["status"] = 0;
            list.push(friend);
        }
        return list;
    },

    getFriend: function (friendId) {
        var from = Blockchain.transaction.from;
        var friend = this.friendRepo.get(friendId);
        if (!friend) {
            var errorItem = {
                "code": 1,
                "message": "friendId is not found"
            };
            return errorItem;
        }
        var tel = friend["tel"];
        var wechat = friend["wechat"];
        friend["tel"] = "***";
        friend["wechat"] = "***";

        if (friend["author"] == from) {
            friend["tel"] = tel;
            friend["wechat"] = wechat;
            friend["status"] = 0;
        } else {
            friend["status"] = 2;
        }

        var user = this.userRepo.get(from);
        if (user) {
            for (var index in user["paid"]) {
                if (friend['author'] == user["paid"][index]) {
                    friend["tel"] = tel;
                    friend["wechat"] = wechat;
                    friend["status"] = 1;
                }
            }
        }

        return friend;
    },

    modify: function(friendId, key, value) {
        var from = Blockchain.transaction.from
        if (from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        var friend = this.friendRepo.get(friendId);
        if (!friend) {
            var errorItem = {
                "code": 1,
                "message": "friendId is not found"
            };
            return errorItem;
        }
        friend[key] = value;
        this.friendRepo.set(friendId, friend);
    },

    deleteFriend: function(friendId) {
        var from = Blockchain.transaction.from
        if (from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        var friendLastId = this.friendSize - 1;
        this.friendSize -= 1;

        var friend = this.friendRepo.get(friendLastId);
        if (!friend) {
            var errorItem = {
                "code": 1,
                "message": "friendId is not found"
            };
            return errorItem;
        }
        this.friendRepo.set(friendId, friend);
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

module.exports = FriendContract;

// saveFriend: function (title, nick, sex, age, tel, wechat, address, profession, hobby, pic1, pic2, pic3,
// description, price, friendId)
// 存储征友信息：标题，昵称，性别，年龄，电话，微信，所在地区，工作职业，兴趣爱好，照片1，照片2，照片3，信息定价，征友信息ID
// checkFriend: function (friendId)
// 支付查看征友信息：征友信息ID
// fondFriend: function (friendId)
// 点赞喜欢：征友信息ID
// _checkMutual: function (friendAuthor, from)
// 更新相互点赞状态：征友信息发布用户地址，应征用户地址
// getFriendList: function (limit, offset, sex)
// 获得征友信息列表：每页数量，偏移量，性别
// getUserOwnedFriendList: function ()
// 查看用户发布的征友信息
// getFriend: function (friendId)
// 获取征友信息内容：征友信息ID
// modify: function(friendId, key, value)
// 管理员修改征友信息属性：征友信息ID，键，值
// deleteFriend: function(friendId)
// 管理员删除征友信息：征友信息ID
