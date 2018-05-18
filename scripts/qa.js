"use strict";

var AuthorItem = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.nick = obj.nick;
        this.balance = parseInt(obj.balance);
        this.questionCount = parseInt(obj.questionCount);
    } else {
        this.nick = "";
        this.balance = 0;
        this.questionCount = 0;
    }
};

AuthorItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var UserItem = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.checkCount = parseInt(obj.checkCount);
    } else {
        this.nick = "";
        this.checkCount = 0;
    }
};

UserItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var QuestionItem = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.id = obj.id;
        this.question = obj.question;
        this.answer = obj.answer;
        this.date = obj.date;
        this.nick = obj.nick;
        this.author = obj.author;
        this.price = obj.price;
        this.balance = parseInt(obj.balance);
        this.checkCount = parseInt(obj.checkCount);
        this.status = obj.status;
    } else {
        this.id = "";
        this.question = "";
        this.answer = "";
        this.date = "";
        this.nick = "";
        this.author = "";
        this.price = "";
        this.balance = 0;
        this.checkCount = 0;
        this.status = "";
    }
};

QuestionItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var CheckItem = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.id = obj.id;
        this.checker = obj.checker;
        this.paid = obj.paid;
        this.date = obj.date;
    } else {
        this.id = "";
        this.checker = "";
        this.paid = "";
        this.date = "";
    }
};

CheckItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var ErrorItem = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.code = obj.code;
        this.message = obj.message;
    } else {
        this.code = "";
        this.message = "";
    }
};

ErrorItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var QAContract = function () {
    LocalContractStorage.defineMapProperty(this, "authorRepo", {
        parse: function (text) {
            return new AuthorItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "userRepo", {
        parse: function (text) {
            return new UserItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "userCheckRepo", {
        parse: function (text) {
            return text;
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "questionRepo", {
        parse: function (text) {
            return new QuestionItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "checkRepo", {
        parse: function (text) {
            return new CheckItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "idMap", {
        parse: function (text) {
            return text;
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineProperty(this, "idSize");
};

QAContract.prototype = {
    init: function () {
        this.idSize = 0;
    },

    saveQuestion: function (question, answer, date, nick, price) {
        question = question.trim();
        answer = answer.trim();
        date = date.trim();
        nick = nick.trim();
        price = price.trim();
        var from = Blockchain.transaction.from;

        var authorItem = this.authorRepo.get(from);
        if (!authorItem) {
            authorItem = new AuthorItem();
            authorItem.nick = nick;
            authorItem.questionCount = 0;
            authorItem.balance = 0;
        }
        var key = from + "$$$" + authorItem.questionCount.toString();
        authorItem.questionCount += 1;
        this.authorRepo.put(from, authorItem);

        var questionItem = new QuestionItem();
        questionItem.id = key;
        questionItem.question = question;
        questionItem.answer = answer;
        questionItem.date = date;
        questionItem.nick = nick;
        questionItem.author = from;
        questionItem.price = price;
        questionItem.balance = 0;
        questionItem.checkCount = 0;

        var index = this.idSize;
        this.questionRepo.put(key, questionItem);
        this.idMap.put(index, key);
        this.idSize += 1;

        // var userItem = this.userRepo.get(from);
        // if (!userItem) {
        //     userItem = new UserItem();
        //     userItem.checkCount = 0;
        // }
        // var userCheckKey = from + "@@@" + userItem.checkCount.toString();
        // userItem.checkCount += 1;
        // this.userRepo.put(from, userItem);
        // this.userCheckRepo.put(userCheckKey, key);
    },

    checkQuestion: function (id, date) {
        id = id.trim();
        var questionItem = this.questionRepo.get(id);
        if (!questionItem) {
            var errorItem = new ErrorItem();
            errorItem.code = "1";
            errorItem.message = "current id is not found";
            return errorItem;
        }
        var price = new BigNumber(questionItem.price);
        var value = Blockchain.transaction.value;
        if (value.lt(price)) {
            Blockchain.transfer("n1FXZVbvLLHhWGK9rgAwLjsXt2jp3SEkFkM", value);
            var errorItem = new ErrorItem();
            errorItem.code = "2";
            errorItem.message = "insufficient balance";
            return errorItem;
        }
        var flag = Blockchain.transfer(questionItem.author, value);
        if (flag == true) {

            var from = Blockchain.transaction.from;
            var userItem = this.userRepo.get(from);
            if (!userItem) {
                userItem = new UserItem();
                userItem.checkCount = 0;
            }
            var key = from + "@@@" + userItem.checkCount.toString();
            userItem.checkCount += 1;
            this.userRepo.put(from, userItem);
            this.userCheckRepo.put(key, id);

            questionItem.checkCount += 1;
            questionItem.balance += value;
            this.questionRepo.put(id, questionItem);

            key = id + "$$$" + questionItem.checkCount.toString();
            var checkItem = new CheckItem();
            checkItem.id = key;
            checkItem.checker = from;
            checkItem.paid = value.toString();
            checkItem.date = date;
            this.checkRepo.put(key, checkItem);

            var authorId = id.split("$$$")[0];
            var authorItem = this.authorRepo.get(authorId);
            authorItem.balance += value;
            this.authorRepo.put(authorId, authorItem);
        }
        return null;
    },

    getQuestionList: function (limit, offset) {
        var limitNum = parseInt(limit);
        var offsetNum = parseInt(offset);
        if (offsetNum > this.idSize) {
            var errorItem = new ErrorItem();
            errorItem.code = "3";
            errorItem.message = "offset is invalid";
            return errorItem;
        }
        var number = offsetNum + limitNum;
        if (number > this.idSize) {
            number = this.idSize;
        }

        var from = Blockchain.transaction.from;
        var userItem = this.userRepo.get(from);
        var userCheckCount = 0;
        if (userItem) {
            userCheckCount = userItem.checkCount;
        }

        var list = [];
        for (var i = offsetNum; i < number; i ++) {
            var id = this.idMap.get(i);
            var questionItem = this.questionRepo.get(id);
            var answer = questionItem.answer;
            questionItem.answer = questionItem.answer.substr(0, 16);
            var author = id.split("$$$")[0];

            if (author == from) {
                questionItem.status = "0";//拥有
            } else {
                questionItem.status = "2";//未购买
            }

            for (var j = 0; j < userCheckCount; j ++) {
                var key = from + "@@@" + j.toString();
                var value = this.userCheckRepo.get(key);
                if (id == value) {
                    questionItem.status = "1";//已购买
                }
            }
            list.push(questionItem);
        }
        return list;
    },

    getAuthorQuestionList: function () {
        var list = [];
        var from = Blockchain.transaction.from;
        var authorItem = this.authorRepo.get(from);
        if (!authorItem) {
            return list;
        }
        var size = authorItem.questionCount;
        for (var i = 0; i < size; i ++) {
            var key = from + "$$$" + i.toString();
            var questionItem = this.questionRepo.get(key);
            questionItem.status = "0";
            questionItem.answer = questionItem.answer.substr(0, 16);
            list.push(questionItem);
        }
        return list;
    },

    getQuestionItem: function (id) {
        var from = Blockchain.transaction.from;
        var questionItem = this.questionRepo.get(id);
        if (!questionItem) {
            return null;
        }
        var answer = questionItem.answer;
        questionItem.answer = questionItem.answer.substr(0, 16);
        var author = id.split("$$$")[0];

        var userItem = this.userRepo.get(from);
        var userCheckCount = 0;
        if (userItem) {
            userCheckCount = userItem.checkCount;
        }

        if (author == from) {
            questionItem.answer = answer;
            questionItem.status = "0";//拥有
        } else {
            questionItem.status = "2";//未购买
        }

        for (var j = 0; j < userCheckCount; j ++) {
            var key = from + "@@@" + j.toString();
            var value = this.userCheckRepo.get(key);
            if (id == value) {
                questionItem.answer = answer;
                questionItem.status = "1";//已购买
            }
        }
        return questionItem;
    },

    getUserCheckList: function () {
        var list = [];
        var from = Blockchain.transaction.from;
        var userItem = this.userRepo.get(from);
        if (!userItem) {
            return list;
        }
        var size = userItem.checkCount;
        for (var i = 0; i < size; i ++) {
            var key = from + "@@@" + i.toString();
            var questionId = this.userCheckRepo.get(key);
            var questionItem = this.questionRepo.get(questionId);
            questionItem.status = "2";
            questionItem.answer = questionItem.answer.substr(0, 16);
            list.push(questionItem);
        }
        return list;
    },

    getQuestionCheckList: function (id) {
        var questionItem = this.questionRepo.get(id);
        if (!questionItem) {
            var errorItem = new ErrorItem();
            errorItem.code = "4";
            errorItem.message = "question id is invalid";
            return errorItem;
        }
        var size = this.questionRepo.get(id).checkCount;
        var list = [];
        for (var i = 0; i < size; i ++) {
            var key = id + "$$$" + i.toString();
            var checkItem = this.checkRepo.get(key);
            list.push(checkItem);
        }
        return list;
    },

    getQuestionListSize: function () {
        return this.idSize;
    },

    getAuthorInfo: function (from) {
        return this.authorRepo.get(from);
    },

    getUserInfo: function (from) {
        return this.userRepo.get(from);
    }
};

module.exports = QAContract;

// saveQuestion: function (question, answer, date, nick, price)
// checkQuestion: function (id, date)
// getQuestionList: function (limit, offset)
// getQuestionItem: function (id)
// getAuthorQuestionList: function ()
// getUserCheckList: function ()
// getQuestionCheckList: function (id)