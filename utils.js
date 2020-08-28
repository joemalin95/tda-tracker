utils = {
    getCookie: function(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    },

    getAccessToken: function(callback) {
        var url = window.location;
        var access_token = utils.getCookie('access_token');
        if (access_token == null) {
            window.location.replace('/login.html');
        } else {
            callback(access_token);
        }
    },

    getAccount: function(access_token, callback) {
        $.ajax({
            type: "GET",
            url: 'https://api.tdameritrade.com/v1/accounts',
            beforeSend: function (xhr) {
              xhr.setRequestHeader("Authorization", "Bearer " + access_token);
            },
            error: function() {
                document.cookie = 'access_token=; Max-Age=-99999999;';  
                window.location.replace('/login.html');
            },
            success: function(data) {
                callback(data)
            }
        });
    },

    loading: false,

    startLoading: function(debounce) { 
        $('.loading-object').contents().find('#loading-container').show();
        $('#loading-object').show();
        $(utils.selector).hide();
        utils.loading = true;
        setTimeout(function() { utils.loading = false; }, debounce*1000) 
    },

    loadPage: function(selector) {
        utils.selector = selector;
        if (!utils.loading) {
            $('.loading-object').contents().find('#loading-container').hide();
            $('#loading-object').hide();
            $(selector).show();
        } else {
            setTimeout(function() { utils.loadPage(selector); }, 100);
        }
    },
    selector: null
}
