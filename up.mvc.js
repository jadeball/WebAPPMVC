/**
 * Created by wangyuqiu on 14-5-28.
 */
define('up.mvc',[], function() {
    var mymvc = {};

    //精简前端路由
    /**
     * 使用方法
     *
     require([
        'up.mvc'
        ],function(mymvc){
            mymvc.router.when('/',"views/mypayment/cardIndex.html",function(data){
                require(['upop.cardIndex'],function(cardIndex){
                    cardIndex.load(data);
                });
            }).when('/cardIndex',"views/mypayment/cardIndex.html",function(data){
                require(['upop.cardIndex'],function(cardIndex){
                    cardIndex.load(data);
                });
            }).when('/userLogin',"views/mypayment/userLogin.html",function(data){
                require(['upop.userLogin'],function(cardIndex){
                    userLogin.load(data);
                });
            }).when('/cardPay',"views/mypayment/cardPay.html",function(data){
                require(['upop.cardPay'],function(cardIndex){
                    cardPay.load(data);
                });
            }).run();
        });
     **/
    var router = function(){
        return this.init.apply(this, arguments);
    };

    router.run = function(){
        var url = location.hash.slice(1) || '/';
        var route = router.routers[url];
        if(!!route){

            if(!route.data){
                mymvc.ajax.get({
                    url:route.templateURL,
                    data:{},
                    asyn:true,
                    dataType:"text/html",
                    success:function(text){
                        //console.log(text);
                        route.controller(text);
                        route.data = text;
                    },fail:function(){
                        !!console && console.log("ajax 获取失败！");
                    }
                });
            }else{
                !!console && console.log("read from cache !!!!");
                route.controller(route.data);
            }

        }else{
            //路径错误
            !!console && console.log("路径错误");
        }


    }

    router.routers = {};
    router.prototype = (function(){

        return {
            init:function(){
                window.addEventListener('hashchange',router.run);
                window.addEventListener('load',router.run);
                return this;
            },
            when:function(path,templateURL,controller){
                router.routers[path] = {templateURL: templateURL, controller: controller};
                return this;
            },
            run:router.run

        }
    })();

    mymvc.router = new router();



    //精简dom选择器 目前仅支持ID 和 类选择器 内置模版引擎代替大部分界面操作

    (function (ns) {


        var doc = document;
        var simple = /^(?:#|\.)?([\w-_]+)/;

        function api(query, context) {

            context = context || doc;

            //调用原生选择器
            if(!simple.test(query) && context.querySelectorAll){
                return context.querySelectorAll(query);
            }else {
                //调用自定义选择器
                return interpret(query, context);
            }

        }

        //解释执行dom选择符
        function interpret(query, context){
            var parts = query.replace(/\s+/, " ").split(" ");
            var part = parts.pop();
            var selector = Factory.create(part);
            var ret = selector.find(context);

            return (parts[0] && ret[0]) ? filter(parts, ret) : ret;
        }

        //ID选择器
        function IDSelector(id) {
            this.id = id.substring(1);
        }
        IDSelector.prototype = {

            find: function (context) {
                return document.getElementById(this.id);
            },

            match: function(element){
                return element.id == this.id;
            }

        };
        IDSelector.test = function (selector) {

            var regex = /^#([\w\-_]+)/;

            return regex.test(selector);

        };

        //类选择器
        function ClassSelector(className) {
            var splits = className.split('.');

            this.tagName = splits[0] || undefined ;
            this.className = splits[1];
        }
        ClassSelector.prototype = {

            find: function (context) {
                var elements;
                var ret = [];
                var tagName = this.tagName;
                var className = this.className;
                var selector = new TagSelector((tagName || "*"));

                //支持原生getElementsByClassName
                if (context.getElementsByClassName) {
                    elements = context.getElementsByClassName(className);
                    if(!tagName){
                        return elements;
                    }
                    for(var i=0,n=elements.length; i<n; i++){
                        if( selector.match(elements[i]) ){
                            ret.push(elements[i]);
                        }
                    }

                } else {
                    elements = selector.find(context);
                    for(var i=0, n=elements.length; i<n; i++){
                        if( this.match(elements[i]) ) {
                            ret.push(elements[i]);
                        }
                    }
                }

                return ret;

            },

            match: function(element){
                var className = this.className;
                var regex = new RegExp("^|\\s" + className + "$|\\s");
                return regex.test(element.className);
            }

        };
        ClassSelector.test = function (selector) {
            var regex = /^([\w\-_]+)?\.([\w\-_]+)/;

            return regex.test(selector);
        };


        //根据父级元素过滤
        function filter(parts, nodeList){
            var part = parts.pop();
            var selector = Factory.create(part);
            var ret = [];
            var parent;

            for(var i=0, n=nodeList.length; i<n; i++){
                parent = nodeList[i].parentNode;
                while(parent && parent !== doc){
                    if(selector.match(parent)){
                        ret.push(nodeList[i]);
                        break;
                    }
                    parent = parent.parentNode;
                }
            }

            return parts[0] && ret[0] ? filter(parts, ret) : ret;
        }

        //根据查询选择符创建相应选择器对象
        var Factory = {

            create: function (query) {

                if (IDSelector.test(query)) {
                    return new IDSelector(query);
                } else if (ClassSelector.test(query)) {
                    return new ClassSelector(query);
                } 
            }
        };

        ns.dom || (ns.dom = {});
        ns.dom.get = api;
    }(mymvc));

    mymvc.jq = mymvc.dom;
    mymvc.$ = mymvc.dom;

    //精简json  浏览器内置JSON对象
    mymvc.JSON = JSON;
    //精简ajax
    function ajax(){
        return this._init.apply(this,arguments);
    }
    ajax.settings = {};
    ajax.settings.timeout = 5000;
    ajax.settings.timeoutError = function(){
        !!console && console.log('ajax request time out');
    };

    ajax.prototype = (function(){

        return {
            _init:function(options){

                if (window.XMLHttpRequest) {
                    this.xhr = new XMLHttpRequest();
                } else {
                    this.xhr = new ActiveXObject('Microsoft.XMLHTTP');
                }

                return this;
            },
            get:function(options){
                var that = this;
                this.options = this.formatOptions(options);
                this.isTimeout = false;
                that.timeFlag = 0;
                this.xhr.open("GET", options.url + "?" + this.formatParams(options.data), true);
                this.xhr.send(null);
                this.xhr.onreadystatechange = function(){
                    that.onreadystatechange();
                };

                that.timeFlag = setTimeout(function(){
                    if(that.xhr.readyState != 4) {
                        that.isTimeout = true;
                        that.xhr.abort();
                        that.xhr = null;
                        that.options.timeoutError();
                        clearTimeout(that.timeFlag);
                    }
                }, this.options.timeout);

                return this;
            },
            post:function(options){
                var that = this;
                this.options = this.formatOptions(options);
                this.isTimeout = false;
                that.timeFlag = 0;
                this.xhr.open("POST", options.url, options.async);
                this.xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                this.xhr.send(this.formatParams(options.data));

                this.xhr.onreadystatechange = function(){
                    that.onreadystatechange();
                };

                that.timeFlag = setTimeout(function(){
                    if(that.xhr.readyState != 4) {
                        that.isTimeout = true;
                        that.xhr.abort();
                        that.xhr = null;
                        that.options.timeoutError();
                        clearTimeout(that.timeFlag);
                    }
                }, this.options.timeout);

                return this;
            },


            formatParams:function(data){
                var arr = [];
                for (var name in data) {
                    arr.push(encodeURIComponent(name) + "=" + encodeURIComponent(data[name]));
                }
                arr.push(("v=" + Math.random()).replace(".",""));
                return arr.join("&");
            },
            formatOptions:function(options){
                options = options || {};
                options.type = (options.type || "GET").toUpperCase();
                options.dataType = options.dataType || "json";
                options.async = !!options.async;
                options.timeout = !!options.timeout || ajax.settings.timeout;
                options.timeoutError = !!options.timeoutError || ajax.settings.timeoutError;
                return options;
            },
            onreadystatechange:function(){

                if (this.xhr.readyState == 4 ) {
                    var status = this.xhr.status;
                    if ((status >= 200 && status < 300)  && !this.isTimeout  ) {
                        clearTimeout(this.timeFlag);
                        this.options.success && this.options.success(this.xhr.responseText, this.xhr.responseXML);
                        this.xhr = null;
                    } else {
                        clearTimeout(this.timeFlag);
                        this.xhr = null;
                        this.options.fail && this.options.fail(status);
                    }
                }
            }
        }
    })();


    mymvc.ajax = {};
    mymvc.ajax.get = function(options){
        new ajax().get(options);
    };
    mymvc.ajax.post = function(options){
        new ajax().post(options);
    };



    //精简模版引擎
    //实现key-value 替换 IF FOR 逻辑控制
    var template = function() {
        function _diving(key,kv) {
            var keys = key.split("\.");
            var i = 0;
            do {
                kv = kv[keys[i++]];
                if(kv==null) break;
            } while(i<keys.length&&typeof(kv)=='object');
            return kv;
        }
        function _applyMapTpl(tpl, values, renderer, pk, parent) {
            var re = /\$?\{([^\}]+?)\}/ig;
            var view = tpl.replace(re, function($0,$1) {
                try {
                    var val = _diving($1,values);
                    val = (val==null?"":val);
                    if(typeof renderer=='function') {
                        var tmp = renderer.call(this, $1, val, values, pk, parent);
                        return tmp==null?val:tmp;
                    }
                    return val;
                } catch(e){ alert($1||e.message||e);return null;}
            });
            return view;
        }
        function _applyTpl(tpl, data, renderer, pk, parent){
            var regx = /<(tpl\d?)\s+(\w+)\s*=\s*(['|"]{1})([^\3]+?)\3\s*>([\s\S]+?)<\/\1>/ig;
            if(regx.test(tpl)) {
                tpl = tpl.replace(regx, function($0,$1,$2,$3,$4,$5){
                    var output = "";
                    if($2!=null) {
                        if($2.toUpperCase()=="FOR") {
                            var arr = data;
                            if($4!=".") {
                                arr = _diving($4,data);
                            }
                            for(var i=0;arr!=null&&i<arr.length;i++) {
                                var item = {};
                                if(typeof(arr[i])!='object') {
                                    item.__val = arr[i];
                                } else {
                                    item = arr[i];
                                }
                                item.__offset = i;
                                output+=_applyTpl($5,item,renderer,$4,arr);
                            }
                        } else if($2.toUpperCase()=="IF") {
                            try {
                                if(eval(applyTpl($4,data))) {
                                    return _applyTpl($5, data, renderer, pk, parent);
                                }
                            } catch(e) {
                                !!console && console.log($4||e.message||e);
                            }
                        }
                    }
                    return output;
                });
            }
            return _applyMapTpl(tpl, data, renderer, pk, parent);
        }
        return function(){
            this.diving=_diving;
            this.applyTpl=_applyTpl;
            return this;
        };
    }()();
    //精简前端模版引擎
    mymvc.template = template;


    //Single Page  WebAPP URL 处理
    var Url = function (url) {
        url = url || "";
        this.url = url;
        this.query = {};
        this.parse();
    };

    Url.prototype = {
        //解析URL，注意解析锚点必须在解析GET参数之前，以免锚点影响GET参数的解析
        parse : function (url){
            if (url) {
                this.url = url;
            }
            this.parseAnchor();
            this.parseParam();
        },
        //解析锚点 #anchor
        parseAnchor : function (){
            var anchor = this.url.match(/\#(.*)/);
            anchor = anchor ? anchor[1] : null;
            this._anchor = anchor;
            if (anchor != null){
                this.anchor = this.getNameValuePair(anchor);
                this.url = this.url.replace(/\#.*/,"");
            }
        },

         // 解析GET参数 ?name=value;
        parseParam : function (){
            var query = this.url.match(/\?([^\?]*)/);
            query = query ? query[1] : null;
            if (query != null){
                this.url = this.url.replace(/\?([^\?]*)/,"");
                this.query = this.getNameValuePair(query);
            }
        },

        getNameValuePair : function (str){
            var o = {};
            str.replace(/([^&=]*)(?:\=([^&]*))?/gim, function (w, n, v) {
                if(n == ""){return;}
                //v = v || "";//alert(v)
                //o[n] = ((/[a-z\d]+(,[a-z\d]+)*/.test(v)) || (/^[\u00ff-\ufffe,]+$/.test(v)) || v=="") ? v : (v.j2o() ? v.j2o() : v);
                o[n] = v || "";
            });
            return o;
        },

        getParam : function (sPara) {
            return this.query[sPara] || "";
        },

        clearParam : function (){
            this.query = {};
        },

        setParam : function (name, value) {
            if (name == null || name == "" || typeof(name) != "string") {
                throw new Error("no param name set");
            }
            this.query = this.query || {};
            this.query[name]=value;
        },

        setParams : function (o){
            this.query = o;
        },
         //序列化一个对象为值对的形式
        serialize : function (o){
            var ar = [];
            for (var i in o){
                if (o[i] == null || o[i] == "") {
                    ar.push(i + "=");
                }else{
                    ar.push(i + "=" + o[i]);
                }
            }
            return ar.join("&");
        },
        //将URL对象转化成为标准的URL地址
        toString : function (){
            var queryStr = this.serialize(this.query);
            return this.url + (queryStr.length > 0 ? "?" + queryStr : "")
                + (this.anchor ? "#" + this.serialize(this.anchor) : "");
        },

        getHashStr : function (forceSharp){
            return this.anchor ? "#" + this.serialize(this.anchor) : (forceSharp ? "#" : "");
        }
    };


    mymvc.util = (function(){

        return {

            url : function(url) {
                return new Url(url);
            },

            cookie:function(){

                return {
                    setcookie : function(cookieName, cookieValue, seconds, path, domain, secure){
                        var expires = new Date();
                        if(cookieValue == '' || seconds < 0) {
                            cookieValue = '';
                            seconds = -2592000;
                        }
                        expires.setTime(expires.getTime() + seconds * 1000);
                        document.cookie = escape(cookieName) + '=' + escape(cookieValue)
                            + (expires ? '; expires=' + expires.toGMTString() : '')
                            + (path ? '; path=' + path : '/')
                            + (domain ? '; domain=' + domain : '')
                            + (secure ? '; secure' : '');
                    },
                    getcookie : function(name, nounescape) {
                        var cookie_start = document.cookie.indexOf(name);
                        var cookie_end = document.cookie.indexOf(";", cookie_start);
                        if(cookie_start == -1) {
                            return '';
                        } else {
                            var v = document.cookie.substring(cookie_start + name.length + 1, (cookie_end > cookie_start ? cookie_end : document.cookie.length));
                            return !nounescape ? unescape(v) : v;
                        }
                    }
                }

            }()
        }

    })();


    return mymvc;
});
