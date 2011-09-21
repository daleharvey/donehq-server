
window.log = function() {
  log.history = log.history || [];
  log.history.push(arguments);
  if(this.console){
    console.log( Array.prototype.slice.call(arguments) );
  }
};


$.ajaxSetup({
  cache: false,
  contentType: 'application/json'
});

var nil = function() { };


// Basic wrapper for localStorage
var localJSON = (function(){
  if (!localStorage) {
    return false;
  }
  return {
    set: function(prop, val) {
      localStorage.setItem(prop, JSON.stringify(val));
    },
    get: function(prop, def) {
      return JSON.parse(localStorage.getItem(prop) || 'false') || def;
    },
    remove: function(prop) {
      localStorage.removeItem(prop);
    }
  };
})();


var Tasks = (function () {

  var router = Router();

  router.post('#logout', function() {
    $.ajax({
      type: 'DELETE',
      url: '/couch/_session'
    }).then(function() {
      renderUserPanel();
    });
  });

  router.post('#login', function (_, e, details) {

    var credentials = {
      user: details.username,
      password: details.password
    };

    $.ajax({
      type: 'POST',
      url: '/login',
      data: JSON.stringify(credentials)
    }).then(function(data) {
      document.location = '/user/' + details.username + '/';
    }).fail(function(data) {
      alert('Login Failed');
    });
  });


  router.post('#register', function (_, e, details) {

    var credentials = {
      user: details.username,
      password: details.password
    };

    $.ajax({
      type: 'POST',
      url: '/register',
      data: JSON.stringify(credentials)
    }).then(function(data) {

      var replicate = {
        source: 'master',
        target: details.username
      };

      $.ajax({
        type: 'POST',
        url: '/couch/_replicate',
        contentType: 'application/json',
        data: JSON.stringify(replicate)
      }).then(function(data) {
        document.location = '/user/' + details.username + '/';
      });

    }).fail(function(data) {
      alert('Registration Failed');
    });
  });


  function renderUserPanel() {
    $.get("/couch/_session", function(data) {
      var tpl = (!data.userCtx.name)
        ? Mustache.to_html($("#logged_out_tpl").html(), {})
        : Mustache.to_html($("#logged_in_tpl").html(), {name: data.userCtx.name});
      $("#user_panel").html(tpl);
    }, "json");
  }


  router.init(window);
  renderUserPanel();

})();
