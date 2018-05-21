'use strict';

var BattleItem = function (text) {
    if (text) {
        var o = JSON.parse(text);
        this.id = o.id;
        this.battleName = o.battleName;
        this.redPartyDes = o.redPartyDes;
        this.bluePartyDes = o.bluePartyDes;
        this.founder = o.founder;
        this.founderBonus = parseFloat(o.founderBonus);
        this.winner = o.winner;
        this.createTime = parseInt(o.createTime);
    } else {
        this.id = "";
        this.battleName = "";
        this.redPartyDes = "";
        this.bluePartyDes = "";
        this.founder = "";
        this.founderBonus = 0.0;
        this.winner = "";
        this.createTime = 0;
    }
};

BattleItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var PartyItem = function (text) {
    if (text) {
        var o = JSON.parse(text);
        this.count = parseInt(o.count);
        this.balance = parseFloat(o.balance);
        this.flag = o.flag;
    } else {
        this.count = 0;
        this.balance = 0.0;
        this.flag = "";
    }
};

PartyItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var FighterItem = function (text) {
    if (text) {
        var o = JSON.parse(text)
        this.investment = parseFloat(o.investment);
        this.reward = parseFloat(o.reward);
        this.from = o.from;
    } else {
        this.investment = 0.0;
        this.reward = 0.0;
        this.from = "";
    }
};

FighterItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var BattleContract = function () {
    LocalContractStorage.defineMapProperty(this, "battleMap", {
        parse: function (text) {
            return new BattleItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "partyMap", {
        parse: function (text) {
            return new PartyItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "fightersMap", {
        parse: function (text) {
            return new FighterItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "fightersIdMap", {
        parse: function (text) {
            return text;
        },
        stringify: function (o) {
            return o.toString();
        }
    });

    LocalContractStorage.defineProperty(this, "currentBattleKey");
    LocalContractStorage.defineProperty(this, "isBattling");
    LocalContractStorage.defineProperty(this, "battleCount");
    LocalContractStorage.defineProperty(this, "founderCharge");
    LocalContractStorage.defineProperty(this, "durationTime");

    LocalContractStorage.defineProperty(this, "bankAddress");
    LocalContractStorage.defineProperty(this, "adminAddress");
    LocalContractStorage.defineProperty(this, "adminCharge");
};

BattleContract.prototype = {
    init: function () {
        this.battleCount = 0;
        this.founderCharge = 0.03;
        this.durationTime = 86400000;
        this.bankAddress = "n1aRaRVXrRr1be7i8y1ZCZnEBwX7HGUmQHr";
        this.adminAddress = "n1PMUxrXSuHQcDRLRHLTrokqQHtDUXdXE9r";
        this.adminCharge = 0;

        this.currentBattleKey = "";
        this.isBattling = false;
    },

    setupBattle: function (battleName, redPartyDes, bluePartyDes) {
        if (this.isBattling != false) {
            throw new Error("battle not complete.");
        }

        var from = Blockchain.transaction.from;
        this.currentBattleKey = "battle@@@" + this.battleCount.toString();
        var redPartyKey = this.currentBattleKey + "@@@red";
        var bluePartyKey = this.currentBattleKey + "@@@blue";

        var battleItem = new BattleItem();
        battleItem.id = this.currentBattleKey;
        battleItem.battleName = battleName;
        battleItem.redPartyDes = redPartyDes;
        battleItem.bluePartyDes = bluePartyDes;
        battleItem.founder = from;
        battleItem.founderBonus = 0.0;
        battleItem.winner = "";
        battleItem.createTime = new Date().getTime();
        this.battleMap.put(this.currentBattleKey, battleItem);

        var redPartyItem = new PartyItem();
        redPartyItem.balance = 0.0;
        redPartyItem.count = 0;
        redPartyItem.flag = "red";
        this.partyMap.put(redPartyKey, redPartyItem);
        var bluePartyItem = new PartyItem();
        bluePartyItem.balance = 0.0;
        bluePartyItem.count = 0;
        bluePartyItem.flag = "blue";
        this.partyMap.put(bluePartyKey, bluePartyItem);

        this.isBattling = true;
        this.battleCount += 1;
    },

    joinBattle: function (flag) {
        if (this.isBattling != true) {
            throw new Error("battle is completed.");
        }
        if (this.battleMap.get(this.currentBattleKey).createTime + this.durationTime < new Date().getTime()) {
            throw new Error("battle is complete.");
        }
        if (flag != "red" && flag != "blue") {
            throw new Error("setup flag invalid");
        }

        var from = Blockchain.transaction.from;
        var value = Blockchain.transaction.value.dividedBy(1000000000000000000).toNumber();
        if (value > 1.0) {
            throw new Error("exceed the maximum voting limit.");
        }
        var partyKey = this.currentBattleKey + "@@@" + flag;
        var partyItem = this.partyMap.get(partyKey);
        var fighterKey = partyKey + "@@@" + from;
        var fighterItem = this.fightersMap.get(fighterKey);
        if (!fighterItem) {
            fighterItem = new FighterItem();
            fighterItem.reward = 0.0;
            fighterItem.investment = 0.0;
            fighterItem.from = from;
            var fighterId = partyKey + "@@@" + partyItem.count.toString();
            partyItem.count += 1;
            this.fightersIdMap.put(fighterId, fighterKey);
        }
        value *= 1000000;
        fighterItem.investment *= 1000000;
        fighterItem.investment += value;
        fighterItem.investment /= 1000000;
        if (fighterItem.investment > 1.0) {
            throw new Error("exceed the maximum voting limit.");
        }
        this.fightersMap.put(fighterKey, fighterItem);
        partyItem.balance *= 1000000;
        partyItem.balance += value;
        partyItem.balance /= 1000000;
        this.partyMap.put(partyKey, partyItem);
    },

    payOff: function () {
        if (this.isBattling != true) {
            throw new Error("battle not started yet.");
        }
        if (this.battleMap.get(this.currentBattleKey).createTime + this.durationTime > new Date().getTime()) {
            throw new Error("battle not complete.");
        }

        var redPartyKey = this.currentBattleKey + "@@@red";
        var bluePartyKey = this.currentBattleKey + "@@@blue";
        var redPartyItem = this.partyMap.get(redPartyKey);
        var bluePartyItem = this.partyMap.get(bluePartyKey);
        var battleItem = this.battleMap.get(this.currentBattleKey);

        if (bluePartyItem.balance < redPartyItem.balance) {
            if (0 < bluePartyItem.balance) {
                var totalBonus = bluePartyItem.balance;
                var founderBonus = totalBonus * this.founderCharge;
                var adminBonus = totalBonus * this.adminCharge;
                totalBonus = parseInt(totalBonus * 1000000);
                founderBonus = parseInt(founderBonus * 1000000);
                adminBonus = parseInt(adminBonus * 1000000);
                var winnerBonus = totalBonus - founderBonus - adminBonus;
                winnerBonus /= 1000000;
                founderBonus /= 1000000;
                adminBonus /= 1000000;
                this._payOffFounder(founderBonus);
                this._payOffWinner(redPartyKey, winnerBonus);
                this._returnInvestment(redPartyKey);
                this._payOffBank(adminBonus);
                battleItem.winner = "red";
                battleItem.founderBonus = founderBonus;
            } else {
                this._returnInvestment(redPartyKey);
                battleItem.winner = "red";
                battleItem.founderBonus = 0;
            }
        } else if (redPartyItem.balance < bluePartyItem.balance) {
            if (0 < redPartyItem.balance) {
                var totalBonus = redPartyItem.balance;
                var founderBonus = totalBonus * this.founderCharge;
                var adminBonus = totalBonus * this.adminCharge;
                totalBonus = parseInt(totalBonus * 1000000);
                founderBonus = parseInt(founderBonus * 1000000);
                adminBonus = parseInt(adminBonus * 1000000);
                var winnerBonus = totalBonus - founderBonus - adminBonus;
                winnerBonus /= 1000000;
                founderBonus /= 1000000;
                adminBonus /= 1000000;
                this._payOffFounder(founderBonus);
                this._payOffWinner(bluePartyKey, winnerBonus);
                this._returnInvestment(bluePartyKey);
                this._payOffBank(adminBonus);
                battleItem.winner = "blue";
                battleItem.founderBonus = founderBonus;
            } else {
                this._returnInvestment(bluePartyKey);
                battleItem.winner = "blue";
                battleItem.founderBonus = 0;
            }
        } else {
            if (0 < bluePartyItem.balance && 0 < redPartyItem.balance) {
                var redToFounderBonus = redPartyItem.balance * this.founderCharge;
                var blueToFounderBonus = bluePartyItem.balance * this.founderCharge;
                var redToAdminBonus = redPartyItem.balance * this.adminCharge;
                var blueToAdminBonus = bluePartyItem.balance * this.adminCharge;
                var founderBonus = parseInt((redToFounderBonus + blueToFounderBonus) * 1000000) / 1000000;
                var adminBonus = parseInt((redToAdminBonus + blueToAdminBonus) * 1000000) / 100000;
                this._payOffFounder(founderBonus);
                this._payOffWinner(redPartyKey, parseInt((redPartyItem.balance - redToFounderBonus - redToAdminBonus) * 1000000) / 1000000);
                this._payOffWinner(bluePartyKey, parseInt((bluePartyItem.balance - blueToFounderBonus - blueToAdminBonus) * 1000000) / 1000000);
                this._payOffBank(adminBonus);
                battleItem.winner = "The two teams drew.";
                battleItem.founderBonus = founderBonus;
            }
        }

        this.battleMap.put(this.currentBattleKey, battleItem);
        this.isBattling = false;
        this.currentBattleKey = "";
    },

    _payOffWinner: function (partyKey, bonus) {
        var partyItem = this.partyMap.get(partyKey);
        for (var i = 0; i < partyItem.count; i ++) {
            var fighterId = partyKey + "@@@" + i.toString();
            var fighterKey = this.fightersIdMap.get(fighterId);
            var fighterItem = this.fightersMap.get(fighterKey);
            var value = parseInt(fighterItem.investment / partyItem.balance * 1000000) / 1000000.0 * bonus;
            var result = Blockchain.transfer(fighterItem.from, value * 1000000000000000000);
            if (!result) {
                Event.Trigger("RedWinnerBonusTransferFailed", {
                    Transfer: {
                        from: Blockchain.transaction.to,
                        to: fighterItem.from,
                        value: value
                    }
                });
                throw new Error("winner bonus transfer failed:" + fighterItem.from + ", nas:" + value);
            }
            Event.Trigger("WinnerBonusTransfer", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: fighterItem.from,
                    value: value
                }
            });
            fighterItem.reward = value;
            this.fightersMap.put(fighterKey, fighterItem);
        }
    },

    _payOffFounder: function (bonus) {
        var battleItem = this.battleMap.get(this.currentBattleKey);
        var founder = battleItem.founder;
        var result = Blockchain.transfer(founder, bonus * 1000000000000000000);
        if (!result) {
            Event.Trigger("FounderBonusTransferFailed", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: founder,
                    value: bonus
                }
            });
            throw new Error("founder bonus transfer failed:" + founder + ", nas:" + bonus);
        }
        Event.Trigger("FounderBonusTransfer", {
            Transfer: {
                from: Blockchain.transaction.to,
                to: founder,
                value: bonus
            }
        });
    },

    _payOffBank: function (bonus) {
        var result = Blockchain.transfer(this.bankAddress, bonus * 1000000000000000000);
        if (!result) {
            Event.Trigger("FounderBonusTransferFailed", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: this.bankAddress,
                    value: bonus
                }
            });
            throw new Error("bank bonus transfer failed:" + this.bankAddress + ", nas:" + bonus);
        }
        Event.Trigger("FounderBonusTransfer", {
            Transfer: {
                from: Blockchain.transaction.to,
                to: this.bankAddress,
                value: bonus
            }
        });
    },

    _returnInvestment: function (partyKey) {
        var partyItem = this.partyMap.get(partyKey);
        for (var i = 0; i < partyItem.count; i ++) {
            var fighterId = partyKey + "@@@" + i.toString();
            var fighterKey = this.fightersIdMap.get(fighterId);
            var fighterItem = this.fightersMap.get(fighterKey);
            var value = fighterItem.investment;
            var result = Blockchain.transfer(fighterItem.from, value * 1000000000000000000);
            if (!result) {
                Event.Trigger("ReturnInvestmentTransferFailed", {
                    Transfer: {
                        from: Blockchain.transaction.to,
                        to: fighterItem.from,
                        value: value
                    }
                });
                throw new Error("return investment transfer failed:" + fighterItem.from + ", Nas:" + value);
            }
            Event.Trigger("ReturnInvestmentTransfer", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: fighterItem.from,
                    value: value
                }
            });
        }
    },

    getPartyInfo: function () {
        var list = [];
        if (this.isBattling) {
            var redPartyKey = this.currentBattleKey + "@@@red";
            var bluePartyKey = this.currentBattleKey + "@@@blue";
            list.push(this.partyMap.get(redPartyKey));
            list.push(this.partyMap.get(bluePartyKey));
            return list;
        }
        if (this.battleCount > 0) {
            var redPartyKey = "battle@@@" + (this.battleCount - 1).toString() + "@@@red";
            var bluePartyKey = "battle@@@" + (this.battleCount - 1).toString() + "@@@blue";
            list.push(this.partyMap.get(redPartyKey));
            list.push(this.partyMap.get(bluePartyKey));
            return list;
        }
        return list;
    },

    getBattleInfo: function () {
        if (this.isBattling) {
            return this.battleMap.get(this.currentBattleKey);
        }
        if (this.battleCount > 0) {
            var key = "battle@@@" + (this.battleCount - 1).toString();
            return this.battleMap.get(key);
        }
        return null;
    },

    getBattleList: function () {
        var list = [];
        var size = this.battleCount - (this.currentBattleKey == "" ? 0 : 1);
        for (var i = 0; i < size; i ++) {
            list.push(this.battleMap.get("battle@@@" + i.toString()));
        }
        return list;
    },

    getFightersInfo: function (battleId, flag) {
        var list = [];
        var battleItem = this.battleMap.get(battleId);
        if (!battleItem || (flag != "red" && flag != "blue")) {
            return list;
        }
        var partyKey = battleItem.id + "@@@" + (flag == "red" ? "red" : "blue");
        var partyItem = this.partyMap.get(partyKey);
        for (var i = 0; i < partyItem.count; i ++) {
            var fighterId = partyKey + "@@@" + i.toString();
            var fighterKey = this.fightersIdMap.get(fighterId);
            var fighterItem = this.fightersMap.get(fighterKey);
            list.push(fighterItem);
        }
        return list;
    },

    getWinnerInfo: function (battleId) {
        var list = [];
        var battleItem = this.battleMap.get(battleId);
        if (!battleItem || (battleItem.winner != "red" && battleItem.winner != "blue")) {
            return list;
        }
        var partyKey = battleItem.id + "@@@" + (battleItem.winner == "red" ? "red" : "blue");
        var partyItem = this.partyMap.get(partyKey);
        for (var i = 0; i < partyItem.count; i ++) {
            var fighterId = partyKey + "@@@" + i.toString();
            var fighterKey = this.fightersIdMap.get(fighterId);
            var fighterItem = this.fightersMap.get(fighterKey);
            list.push(fighterItem);
        }
        return list;
    },

    getTimeToEnd: function () {
        if (this.isBattling == false) {
            return 0;
        }
        var timeToEnd = this.battleMap.get(this.currentBattleKey).createTime + this.durationTime - new Date().getTime()
        return timeToEnd > 0 ? timeToEnd : 0;
    },

    getCurrentBattleId: function () {
        if (this.isBattling == false) {
            throw new Error("battle is completed.");
        }
        return this.currentBattleKey;
    },

    getCurrentBattleNum: function () {
        return this.battleCount;
    },

    getBattleStatus: function () {
        return this.isBattling;
    },

    setBankAddress: function(bankAddress) {
        if (Blockchain.transaction.from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        this.bankAddress = bankAddress;
    },

    setDurationTime: function(durationTime) {
        if (Blockchain.transaction.from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        this.durationTime = parseInt(durationTime);
    },

    setFounderCharge: function(founderCharge) {
        if (Blockchain.transaction.from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        this.founderCharge = parseFloat(founderCharge);
    },

    setAdminCharge: function(adminCharge) {
        if (Blockchain.transaction.from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        this.adminCharge = parseFloat(adminCharge);
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

module.exports = BattleContract;

// setupBattle: function (battleName, redPartyDes, bluePartyDes) 发起battle
// joinBattle: function (flag) 加入battle
// payOff: function () 发起结算
// getPartyInfo: function () 获得阵营信息，如果battle未结束，返回当前battle阵营信息，否则返回上一次battle阵营信息
// getBattleInfo: function () 获得battle信息，如果battle未结束，返回当前battle信息，否则返回上一次battle信息
// getBattleList: function () 获得battle列表
// getBattleStatus: function () 获得当前battle状态
// getWinnerInfo: function (battleId) 获得胜利者信息
// getTimeToEnd: function () 获得battle倒计时
// getCurrentBattleId: function () 获得当前battle的id
// getCurrentBattleNum: function () 获得battle数量
// getFightersInfo: function (battleId, flag) 获得fighter信息