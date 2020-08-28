function Transactions() {
    this.transactions = new Object();
    this.buyContracts = new Object();
    this.sellContracts = new Object();
    this.tradesByDayDict = new Object();
    this.tradesByDayCusipGroupDict = new Object();
    this.startDate = null;
    this.endDate = null;
    this.render = null;
    this.accessToken = null;
}  
Transactions.prototype.setStartDate = function(startDate) {
    startDateObject = new Date(startDate);

    if (startDate && Object.prototype.toString.call(startDateObject) === '[object Date]') {
        this.startDate = startDateObject;
        utils.loading = true;
        utils.startLoading();
        this.fetch(this.accessToken, this.render);
    }
}
Transactions.prototype.setEndDate = function(endDate) {
    endDateObject = new Date(endDate);

    if (endDate && Object.prototype.toString.call(endDateObject) === '[object Date]') {
        this.endDate = endDateObject;
        utils.loading = true;
        utils.startLoading();
        this.fetch(this.accessToken, this.render);
    }
}

Transactions.prototype.fetch = function(accessToken, customRender) {
    this.render = customRender;
    this.accessToken = accessToken;
    utils.getAccount(accessToken, function(accounts) {
        $.ajax({
            type: "GET",
            url: 'https://api.tdameritrade.com/v1/accounts/'+accounts[0]['securitiesAccount']['accountId']+'/transactions',
            beforeSend: function (xhr) {
              xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
            },
            data: {
                type: 'ALL',
            },
            success: function(transactions) {
                console.log(transactions);
                return this.load(transactions, customRender);
            }.bind(this)
        });
    }.bind(this));
}

Transactions.prototype.load = function(transactions, customRender) {
    var buyContracts = getBuyTradeCusipDict(transactions);
    var sellContracts = getSellTradeList(transactions);
    var tradesByDayDict = getTradesByDayDict.bind(this, sellContracts, buyContracts)();
    var tradesByDayCusipGroupDict = getTradesByDayCusipGroupDict(tradesByDayDict);

    this.transactions = transactions;
    this.buyContracts = buyContracts;
    this.sellContracts = sellContracts;
    this.tradesByDayDict = tradesByDayDict;
    this.tradesByDayCusipGroupDict = tradesByDayCusipGroupDict; 

    if (customRender) {
        return customRender(tradesByDayCusipGroupDict);
    } else {
        return tradesByDayCusipGroupDict;
    }

    function getTradesByDayDict(sellContracts, buyContracts) {
        var tradesByDayDict = new Object();
        for (var i in sellContracts) {
            var sellContract = sellContracts[i];
            var cusip = sellContract['transactionItem']['instrument']['cusip'];
            var transactionDate = sellContract['transactionDate'];
            var buyContract = buyContracts[cusip].dequeue();

            if (new Date(buyContract['transactionDate']).getTime() != new Date(sellContract['transactionDate']).getTime()) {
                continue;
            }

            if (this.startDate && sellContract['transactionDate'].getTime() <= this.startDate.getTime()) {
                continue;
            }

            if (this.endDate && sellContract['transactionDate'].getTime() >= this.endDate.getTime()) {
                continue;
            }

            if (tradesByDayDict[transactionDate] === undefined) {
                tradesByDayDict[transactionDate] = [];
            }

            if (buyContract) {
                tradesByDayDict[transactionDate].push(buyContract);
            }
            tradesByDayDict[transactionDate].push(sellContract);
        }
        return tradesByDayDict;
    }


    function getSellTradeList(transactions) {
        var sellList = [];
        // for transaction in group
        for (var i in transactions) {
            var trade = transactions[i];
            var instruction = trade['transactionItem']['instruction'];
            if (instruction !== 'SELL') {
                continue;
            }
            if (Object.prototype.toString.call(trade['transactionDate']) == '[object String]') {
                trade['transactionDate'] = formatTransactionDate(trade['transactionDate'])
            }

            var contractCount = trade['transactionItem']['amount'];
            var totalNetAmount = trade['netAmount'];

            // split contract up
            trade['netAmount'] = totalNetAmount / contractCount;
            trade['totalFees'] = (trade['fees']['commission'] + trade['fees']['optRegFee']) / contractCount;
            trade['transactionItem']['amount'] = 1;
            for (var count = 0; count < contractCount; count++) {
                sellList.push(trade);
            }
        }
        return sellList.sort(sortByTransactionDate);

    }

    function getBuyTradeCusipDict(transactions) {

        var buyCusipDict = new Object;

        // for transaction in group
        for (var i in transactions) {
            var trade = transactions[i];
            var instruction = trade['transactionItem']['instruction'];
            if (instruction !== 'BUY') {
                continue;
            }

            if (Object.prototype.toString.call(trade['transactionDate']) == '[object String]') {
                trade['transactionDate'] = formatTransactionDate(trade['transactionDate'])
            }

            var cusip = trade['transactionItem']['instrument']['cusip'];
            var contractCount = trade['transactionItem']['amount'];
            var totalNetAmount = trade['netAmount'];
            // split contract up
            trade['netAmount'] = totalNetAmount / contractCount;
            trade['totalFees'] = (trade['fees']['commission'] + trade['fees']['optRegFee']) / contractCount;
            trade['transactionItem']['amount'] = 1;
            for (var count = 0; count < contractCount; count++) {
                if (buyCusipDict[cusip] === undefined) {
                    var queue = new Queue();
                    buyCusipDict[cusip] = queue;
                }
                buyCusipDict[cusip].enqueue(trade);
            }
        }

        // sort each queue
        for (var cusip in buyCusipDict) {
            buyCusipDict[cusip].sortByTransactionDate();
        }
        return buyCusipDict;
    }

    function getTradesByDayCusipGroupDict(tradesByDayDict) {
        var tradesByDayCusipGroupDict = new Object();
        // For each transaction, group by transaction date
        for (var tDate in tradesByDayDict) {
            var cusipGroup = new Object();
            for (var i in tradesByDayDict[tDate]) {
                var trade = tradesByDayDict[tDate][i]; 
                var cusip = trade['transactionItem']['instrument']['cusip'];

                if (cusipGroup[cusip] === undefined) {
                    cusipGroup[cusip] = [];
                }
                cusipGroup[cusip].push(trade);
            }
            tradesByDayCusipGroupDict[tDate] = cusipGroup;
        }
        return tradesByDayCusipGroupDict;
    }
};


function Queue() {
   this.elements = [];
}  
Queue.prototype.enqueue = function (e) {
   this.elements.push(e);
};
// remove an element from the front of the queue
Queue.prototype.reverse = function () {
    return this.elements.reverse();
};
Queue.prototype.dequeue = function () {
    return this.elements.shift();
};
// check if the queue is empty
Queue.prototype.isEmpty = function () {
    return this.elements.length == 0;
};
// get the element at the front of the queue
Queue.prototype.peek = function () {
    return !this.isEmpty() ? this.elements[0] : undefined;
}
Queue.prototype.length = function() {
    return this.elements.length;
}
Queue.prototype.sortByTransactionDate= function() {
    return this.elements.sort(sortByTransactionDate);
}


function sortByTransactionDate(a, b) {
    return new Date(b.transactionDate) - new Date(a.transactionDate)
}

function formatTransactionDate(date_) {
    var from = date_.split('T')[0].split("-");
    return new Date(from[0], from[1] - 1, from[2]);
}

function formatDate(date) {
  var year = date.getFullYear();

  var month = (1 + date.getMonth()).toString();
  month = month.length > 1 ? month : '0' + month;

  var day = date.getDate().toString();
  day = day.length > 1 ? day : '0' + day;
  
  return month + '/' + day + '/' + year;
}
