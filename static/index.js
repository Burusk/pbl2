function Api() {
    this.conn = axios.create({
        baseURL: '/',
        timeout: 1000
    });
}

Api.prototype.getUserList = function (keyword, handler) {
    this.conn.get("/user", {
        params: {
            keyword: keyword
        }
    })
        .then(handler);
};

Api.prototype.getMessageList = function (lastTimestamp, handler) {
    this.conn.get("/chat", {
        params: {
            'last_timestamp': lastTimestamp
        }
    })
        .then(handler);
};

Api.prototype.sendMessage = function (nickname, message, handler) {
    this.conn.post("/chat", {
        nickname: nickname,
        message: message
    })
        .then(handler)
};

function NicknameInputModal(elem) {
    this.elem = elem;
    this.inputElem = elem.find("input");
    this.submitElem = elem.find("button");
    this.nickname = "";
    this.onUpdateListener = null;

    const that = this;
    this.inputElem.keydown(function (e) {
        if (e.keyCode === 13) {
            console.log("submit");
            that.submitElem.click();
        }
    });

    this.submitElem.click(function () {
        that.nickname = that.inputElem.val();
        if (that.onUpdateListener != null) {
            that.onUpdateListener(that.nickname);
        }
        that.hide();
    });
}

NicknameInputModal.prototype.getNickname = function () {
    return this.nickname;
};

NicknameInputModal.prototype.hide = function () {
    this.elem.addClass("hide");
};

NicknameInputModal.prototype.show = function () {
    this.elem.removeClass("hide");
};

NicknameInputModal.prototype.setOnUpdatedListener = function (handler) {
    this.onUpdateListener = handler;
};

function Menu(elem) {
    this.elem = elem;
    this.elemMap = {};
    this.selected = null;

    const that = this;
    elem.children(".menu-item").each(function () {
        const $this = $(this);
        that.elemMap[$this.data("menu-name")] = $this;

        if ($this.hasClass("active") && that.selected == null) {
            that.selected = $this;
        }

        $this.click(function () {
            that.selectMenu($this.data("menu-name"));
        });
    });
}

Menu.prototype.selectMenu = function (name) {
    this.selected.removeClass("active");
    this.selected = this.elemMap[name];
    this.selected.addClass("active");
};

Menu.prototype.onClick = function (name, handler) {
    this.elemMap[name].click(handler);
};

function UserList(api, elem) {
    this.api = api;
    this.elem = elem;
    this.data = [];
    this.autoUpdator = null;
    this.myNickname = "";
    this.keyword = "";

    this.enableAutoUpdate();
}

UserList.prototype.update = function () {
    const that = this;

    this.api.getUserList(this.keyword, function (response) {
        that.data = response.data.users;
        that.updateView();
    });
};

UserList.prototype.updateView = function () {
    this.elem.empty();

    const that = this;
    this.data.forEach(function (value) {
        that.elem.append(that.createItemView(value));
    });
};

UserList.prototype.createItemView = function (user) {
    const lastSent = Math.round((Date.now() / 1000 - user.last_timestamp) / 60);

    const container = $("<li/>").addClass("user");
    const profileImage = $("<img src='https://image.flaticon.com/icons/svg/219/219970.svg'/>");
    const infoContainer = $("<div/>").addClass("user-info");
    const nicknameView = $("<div/>").addClass("user-name").text(user.nickname);
    const messageCountView = $("<div/>").addClass("message-count").text("총 " + user.message_count + "회 메시지 전송");
    const lastSentView = $("<span/>").addClass("last-sent").text("" + lastSent + "min ago");

    if (this.myNickname === user.nickname) {
        container.addClass("me");
    }

    container.append(profileImage)
        .append(infoContainer);

    infoContainer.append(nicknameView)
        .append(messageCountView)
        .append(lastSentView);

    return container;
};

UserList.prototype.enableAutoUpdate = function () {
    if (this.autoUpdator != null) {
        return;
    }

    const that = this;

    this.autoUpdator = setInterval(function () {
        that.update("");
    }, 10000);
};

UserList.prototype.disableAutoUpdate = function () {
    if (this.autoUpdator == null) {
        return;
    }
    clearInterval(this.autoUpdator);
    this.autoUpdator = null;
};

UserList.prototype.setMyNickname = function (nickname) {
    this.myNickname = nickname;
};

function MessageList(api, elem) {
    this.api = api;
    this.elem = elem;
    this.data = [];
    this.autoUpdator = null;
    this.nickname = "";

    const that = this;
    this.elem.bind('heightChange', function(){
        that.scrollToBottom();
    });

    this.enableAutoUpdate();
}

MessageList.prototype.lastTimestamp = function () {
    if (this.data.length > 0) {
        return this.data[this.data.length - 1].timestamp;
    }

    return 0;
};

MessageList.prototype.update = function () {
    const that = this;

    this.api.getMessageList(this.lastTimestamp(), function (response) {
        if (that.lastTimestamp() === 0) {
            that.data = response.data.messages;

            that.elem.empty();

            that.data.forEach(function (value) {
                that.elem.append(that.createItemView(value));
            });
        } else {
            response.data.messages.forEach(function (e) {
                that.data.push(e);
                that.elem.append(that.createItemView(e));
            });
        }

        if (response.data.messages.length > 0) {
            that.scrollToBottom();
        }
    });
};

MessageList.prototype.createItemView = function (message) {
    const container = $("<li/>").addClass("message");
    const profileImage = $("<img src='https://image.flaticon.com/icons/svg/219/219970.svg'/>");
    const messageView = $("<p/>").text(message.message);

    if (message.nickname === this.nickname) {
        container.addClass("me");
    }

    container.append(profileImage)
        .append(messageView);

    return container;
};

MessageList.prototype.enableAutoUpdate = function () {
    if (this.autoUpdator != null) {
        return;
    }

    const that = this;

    this.autoUpdator = setInterval(function () {
        that.update();
    }, 500);
};

MessageList.prototype.disableAutoUpdate = function () {
    if (this.autoUpdator == null) {
        return;
    }
    clearInterval(this.autoUpdator);
    this.autoUpdator = null;
};

MessageList.prototype.setNickname = function (nickname) {
    this.nickname = nickname;
    this.data = [];
};

MessageList.prototype.scrollToBottom = function () {
    this.elem.scrollTop(this.elem.get(0).scrollHeight)
};

function MessageInput(api, elem) {
    this.api = api;
    this.elem = elem;
    this.inputElem = elem.find("input");
    this.submitElem = elem.find("button");
    this.onSendMessageListener = null;
    this.nickname = "";

    const that = this;

    this.inputElem.keydown(function (e) {
        if (e.keyCode === 13) {
            that.submitElem.click();
        }
    });

    this.submitElem.click(function () {
        that.sendMessage(that.inputElem.val());
        that.inputElem.val("");
    });
}

MessageInput.prototype.sendMessage = function (message) {
    if (this.onSendMessageListener != null) {
        this.onSendMessageListener(message);
    }

    this.api.sendMessage(this.nickname, message, function (response) {
        //do nothing
    });
};

MessageInput.prototype.setOnSendMessageListener = function (handler) {
    this.onSendMessageListener = handler
};

MessageInput.prototype.setNickname = function (nickname) {
    this.nickname = nickname;
};

function main() {
    const api = new Api();
    const nicknameModal = new NicknameInputModal($("#inputNicknameContainer"));
    const menu = new Menu($("#menu"));
    const userList = new UserList(api, $("#userList"));
    const messageList = new MessageList(api, $("#messageList"));
    const messageInput = new MessageInput(api, $("#messageInput"));

    return function () {
        nicknameModal.setOnUpdatedListener(function (nickname) {
            menu.selectMenu("chat");
            userList.setMyNickname(nickname);
            messageList.setNickname(nickname);
            messageInput.setNickname(nickname);
            userList.update();
            messageList.update();
        });

        menu.onClick("settings", function () {
            nicknameModal.show();
        });

        messageInput.setOnSendMessageListener(function (message) {
            messageList.scrollToBottom();
        });

        $("input[name=user_search_keyword]").keyup(function (e) {
            if (e.keyCode !== 13) {
                return;
            }

            userList.keyword = $(this).val();
            userList.update();
        })
    }
}

main()();