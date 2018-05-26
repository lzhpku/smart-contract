"use strict";

var RecruitmentContract = function () {
    LocalContractStorage.defineMapProperty(this, "userRepo", null);
    LocalContractStorage.defineProperty(this, "userSize", null);
    LocalContractStorage.defineMapProperty(this, "userIdMap", null);
    LocalContractStorage.defineMapProperty(this, "resumeRepo", null);
    LocalContractStorage.defineProperty(this, "resumeSize", null);

    LocalContractStorage.defineProperty(this, "adminAddress");
};

RecruitmentContract.prototype = {
    init: function () {
        this.userSize = 0;
        this.resumeSize = 0;
        this.adminAddress = "n1PMUxrXSuHQcDRLRHLTrokqQHtDUXdXE9r";
    },

    saveResume: function (name, phone, email, profile, education, project, skill, price, date, resumeId) {
        name = name.trim();
        phone = phone.trim();
        email = email.trim();
        profile = profile.trim();
        education = education.trim();
        project = project.trim();
        skill = skill.trim();
        date = date.trim();
        price = price.trim();
        var from = Blockchain.transaction.from;

        var resume = this.resumeRepo.get(resumeId);
        if (!resume) {
            resumeId = this.resumeSize;
            this.resumeSize += 1;
            resume = {
                "author": from,
                "name": name,
                "phone": phone,
                "email": email,
                "profile": profile,
                "education": education,
                "project": project,
                "skill": skill,
                "price": parseFloat(price),
                "date": date,
                "paidCount": 0,
                "status": 0 // 0已拥有，1已购买，2未购买
            };
        } else {
            resume["name"] = name;
            resume["phone"] = phone;
            resume["email"] = email;
            resume["profile"] = profile;
            resume["education"] = education;
            resume["project"] = project;
            resume["skill"] = skill;
            resume["price"] = parseFloat(price);
        }
        this.resumeRepo.set(resumeId, resume);

        var user = this.userRepo.get(from);
        if (!user) {
            var userId = this.userSize;
            this.userSize += 1;
            this.userIdMap.set(userId, from);
            var user = {
                "owned": [resumeId],
                "paid": []
            };
        } else {
            user["owned"].push(resumeId);
        }
        this.userRepo.set(from, user);

        return resume;
    },

    checkResume: function (resumeId) {
        var resume = this.resumeRepo.get(resumeId);
        if (!resume) {
            var errorItem = {
                "code": "1",
                "message": "resumeId is not found"
            };
            return errorItem;
        }
        var value = Blockchain.transaction.value.dividedBy(1000000000000000000).toNumber();
        var price = parseFloat(resume["price"]);
        if (value < price) {
            Blockchain.transfer(this.adminAddress, value * 1000000000000000000);
            var errorItem = {
                "code": "2",
                "message": "insufficient balance"
            };
            return errorItem;
        }
        var flag = Blockchain.transfer(resume["author"], price * 1000000000000000000);
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
            user["paid"].push(resumeId);
            this.userRepo.set(from, user);

            resume["paidCount"] += 1;
            this.resumeRepo.set(resumeId, resume);

            var successItem = {
                "code": "0",
                "message": "check succe"
            };
            return successItem;
        }
        return null;
    },

    getResumeList: function (limit, offset) {
        var limitNum = parseInt(limit);
        var offsetNum = parseInt(offset);
        if (offsetNum > this.resumeSize) {
            var errorItem = {
                "code": "3",
                "message": "offset if invalid"
            };
            return errorItem;
        }
        var number = offsetNum + limitNum;
        if (number > this.resumeSize) {
            number = this.resumeSize;
        }

        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);

        var list = [];
        for (var i = offsetNum; i < number; i ++) {
            var resume = this.resumeRepo.get(i);
            resume["phone"] = "***";
            resume["email"] = "***";
            if (from == resume["author"]) {
                resume["status"] = "0"; //已拥有
            } else {
                resume["status"] = "2"; //未购买
            }

            if (user) {
                for (var index in user["paid"]) {
                    if (resume["author"] == user["paid"][index]) {
                        resume["status"] = "1"; //已购买
                    }
                }
            }
            list.push(resume);
        }
        return list;
    },

    getUserOwnedResumeList: function () {
        var list = [];
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            return list;
        }
        for (var index in user["owned"]) {
            var resume = this.resumeRepo.get(user["owned"][index]);
            resume["phone"] = "***";
            resume["email"] = "***";
            resume["status"] = "0";
            list.push(resume);
        }
        return list;
    },

    getUserPaidResumeList: function () {
        var list = [];
        var from = Blockchain.transaction.from;
        var user = this.userRepo.get(from);
        if (!user) {
            return list;
        }
        for (var index in user["paid"]) {
            var resume = this.resumeRepo.get(user["paid"][index]);
            resume["phone"] = "***";
            resume["email"] = "***";
            resume["status"] = "1";
            list.push(resume);
        }
        return list;
    },

    getResume: function (resumeId) {
        var from = Blockchain.transaction.from
        var resume = this.resumeRepo.get(resumeId);
        if (!resume) {
            return null;
        }
        var phone = resume["phone"];
        var email = resume["email"];
        resume["phone"] = "***";
        resume["email"] = "***";

        if (resume["author"] == from) {
            resume["phone"] = phone;
            resume["email"] = email;
            resume["status"] = "0";
        } else {
            resume["status"] = "2";
        }

        var user = this.userRepo.get(from);
        if (user) {
            for (var index in user["paid"]) {
                if (resumeId == user["paid"][index]) {
                    resume["phone"] = phone;
                    resume["email"] = email;
                    resume["status"] = "1";
                }
            }
        }

        return resume;
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

module.exports = RecruitmentContract;

// saveResume: function (name, phone, email, profile, education, project, skill, price, date, resumeId)
// 存储简历信息：姓名，电话，邮箱，简介，教育背景，项目经历，职业技能，定价，时间，简历ID
// checkResume: function (resumeId)
// 支付查看简历：简历ID
// getResumeList: function (limit, offset)
// 获得简历列表：每页数量，偏移量
// getUserOwnedResumeList: function ()
// 查看用户拥有的简历
// getUserPaidResumeList: function ()
// 查看用户支付的简历
// getResume: function (resumeId)
// 获取简历内容：简历ID
