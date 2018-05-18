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
    } else {
        this.count = 0;
        this.balance = 0.0;
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
        this.durationTime = 180000;
        this.bankAddress = "n1cLy47ogZ1skZ95x1z1WTL6QSi9jNkhcDn";
        this.adminAddress = "n1FXZVbvLLHhWGK9rgAwLjsXt2jp3SEkFkM";
        this.adminCharge = 0;

        this.currentBattleKey = "";
        this.isBattling = false;
    },

    setupBattle: function (setupFlag, battleName, redPartyDes, bluePartyDes) {
        if (this.isBattling != false) {
            throw new Error("battle not complete.");
        }
        if (setupFlag != "red" && setupFlag != "blue") {
            throw new Error("setup flag invalid");
        }

        var from = Blockchain.transaction.from;
        this.currentBattleKey = "battle@@@" + this.battleCount.toString();
        var partyKey = this.currentBattleKey + "@@@" + setupFlag;
        var fighterKey = partyKey + "@@@" + from;

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

        var partyItem = new PartyItem();
        partyItem.balance = 0.0;
        partyItem.count = 0;
        var fighterItem = new FighterItem();
        fighterItem.investment = 0.0;
        fighterItem.reward = 0.0;
        fighterItem.from = from;
        var fighterId = partyKey + "@@@" + partyItem.count.toString();
        this.fightersIdMap.put(fighterId, fighterKey);
        partyItem.count += 1;
        this.fightersMap.put(fighterKey, fighterItem);
        this.partyMap.put(partyKey, partyItem);

        var counterPartyItem = new PartyItem();
        counterPartyItem.balance = 0.0;
        counterPartyItem.count = 0;
        var counterPartyKey = "";
        if (setupFlag == "red") {
            counterPartyKey = this.currentBattleKey + "@@@blue";
        } else {
            counterPartyKey = this.currentBattleKey + "@@@red";
        }
        this.partyMap.put(counterPartyKey, counterPartyItem);

        this.isBattling = true;
        this.battleCount += 1;
    },

    joinBattle: function (flag) {
        if (flag != "red" && flag != "blue") {
            throw new Error("setup flag invalid");
        }

        var from = Blockchain.transaction.from;
        var value = Blockchain.transaction.value.dividedBy(1000000000000000000).toNumber();
        var partyKey = this.currentBattleKey + "@@@" + flag;
        var partyItem = this.partyMap.get(partyKey);
        var fighterKey = partyKey + "@@@" + from;
        var fighterItem = this.fightersMap.get(fighterKey);
        if (!fighterItem) {
            var fighterId = partyKey + "@@@" + partyItem.count.toString();
            partyItem.count += 1;
            this.fightersIdMap.put(fighterId, fighterKey);
            fighterItem = new FighterItem();
            fighterItem.reward = 0.0;
            fighterItem.investment = 0.0;
            fighterItem.from = from;
        }
        fighterItem.investment += value;
        this.fightersMap.put(fighterKey, fighterItem);
        partyItem.balance += value;
        this.partyMap.put(partyKey, partyItem);
    },

    payOff: function () {
        if (this.isBattling != true) {
            throw new Error("battle not started yet.");
        }
        // if (this.battleMap.get(this.currentBattleKey).createTime + this.durationTime > new Date().getTime()) {
        //     throw new Error("battle not complete.");
        // }

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
                var winnerBonus = totalBonus - founderBonus - adminBonus;
                this._payOffFounder(founderBonus);
                this._payOffWinner(redPartyKey, winnerBonus);
                this._returnInvestment(redPartyKey);
                this._payOffBank(adminBonus);
                battleItem.winner = "red";
                battleItem.founderBonus = founderBonus;
            }
        } else if (redPartyItem.balance < bluePartyItem.balance) {
            if (0 < redPartyItem.balance) {
                var totalBonus = redPartyItem.balance;
                var founderBonus = totalBonus * this.founderCharge;
                var adminBonus = totalBonus * this.adminCharge;
                var winnerBonus = totalBonus - founderBonus - adminBonus;
                this._payOffFounder(founderBonus);
                this._payOffWinner(bluePartyKey, winnerBonus);
                this._returnInvestment(bluePartyKey);
                this._payOffBank(adminBonus);
                battleItem.winner = "blue";
                battleItem.founderBonus = founderBonus;
            }
        } else {
            if (0 < bluePartyItem.balance && 0 < redPartyItem.balance) {
                var redToFounderBonus = redPartyItem.balance * this.founderCharge;
                var blueToFounderBonus = bluePartyItem.balance * this.founderCharge;
                var redToAdminBonus = redPartyItem.balance * this.adminCharge;
                var blueToAdminBonus = bluePartyItem.balance * this.adminCharge;
                var founderBonus = redToFounderBonus + blueToFounderBonus;
                var adminBonus = redToAdminBonus + blueToAdminBonus;
                this._payOffFounder(founderBonus);
                this._payOffWinner(redPartyKey, redPartyItem.balance - redToFounderBonus - redToAdminBonus);
                this._returnInvestment(redPartyKey);
                this._payOffWinner(bluePartyKey, bluePartyItem.balance - blueToFounderBonus - blueToAdminBonus);
                this._returnInvestment(bluePartyKey);
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

    getPartyInfo: function (battleId, flag) {
        if (flag != "red" && flag != "blue") {
            throw new Error("setup flag invalid");
        }
        var partyKey = battleId + "@@@" + flag;
        return this.partyMap.get(partyKey);
    },

    getBattleInfo: function (battleId) {
        return this.battleMap.get(battleId);
    },

    getBattleList: function () {
        var list = [];
        for (var i = 0; i < this.battleCount; i ++) {
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
        this.durationTime = durationTime;
    },

    setFounderCharge: function(founderCharge) {
        if (Blockchain.transaction.from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        this.founderCharge = founderCharge;
    },

    setAdminCharge: function(adminCharge) {
        if (Blockchain.transaction.from != this.adminAddress) {
            throw new Error("Permission denied.");
        }
        this.adminCharge = adminCharge;
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

// setupBattle: function (setupFlag, battleName, redPartyDes, bluePartyDes) 发起battle
// joinBattle: function (flag) 加入battle
// payOff: function () 发起结算
// getPartyInfo: function (battleId, flag) 获得阵营信息
// getBattleInfo: function (battleId) 获得battle信息
// getBattleList: function () 获得battle列表
// getFightersInfo: function (battleId, flag) 获得fighter信息
// getWinnerInfo: function (battleId) 获得胜利者信息
// getTimeToEnd: function () 获得battle倒计时
// getCurrentBattleId: function () 获得当前battle的id
// getCurrentBattleNum: function () 获得battle数量
// getBattleStatus: function () 获得当前battle状态