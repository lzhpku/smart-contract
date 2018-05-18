/**
 * Created by lanzheng on 2018/5/6.
 */


"use strict";

var NoteItem = function(text) {
    if (text) {
        var obj = JSON.parse(text);
        this.title = obj.title;
        this.content = obj.content;
        this.date = obj.date;
        this.author = obj.author;
    } else {
        this.title = "";
        this.content = "";
        this.date = "";
        this.author = "";
    }
};

NoteItem.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
};

var NoteBook = function () {
    LocalContractStorage.defineMapProperty(this, "repo", {
        parse: function (text) {
            return new NoteItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineMapProperty(this, "addr", {
        parse: function (str) {
            return new BigNumber(str);
        },
        stringify: function (obj) {
            return obj.toString();
        }
    });
};

NoteBook.prototype = {
    init: function () {
    },

    save: function (title, content, date, author) {

        title = title.trim();
        content = content.trim();
        date = date.trim();
        author = author.trim();


        var from = Blockchain.transaction.from;
        var size = this.addr.get(from);
        if (!size) {
            size = 0;
        }
        size += 1;
        this.addr.put(from, size);

        var key = from + size.toString();
        var noteItem = new NoteItem();
        noteItem.title = title;
        noteItem.content = content;
        noteItem.date = date;
        noteItem.author = author;
        this.repo.put(key, noteItem);
    },

    get: function () {
        var from = Blockchain.transaction.from;
        var size = this.addr.get(from);
        var list = [];
        for (var i = 1; i <= size; i ++) {
            var key = from + i.toString();
            var noteItem = this.repo.get(key);
            list.push(noteItem);
        }
        return list;
    }
};

module.exports = NoteBook;
