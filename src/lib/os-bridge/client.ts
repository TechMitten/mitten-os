const OS_BRIDGE_CLIENT_SCRIPT = `
(function() {
  var pending = {};

  function send(type, payload) {
    return new Promise(function(resolve, reject) {
      var requestId = 'req_' + Math.random().toString(36).slice(2) + Date.now();
      pending[requestId] = { resolve: resolve, reject: reject };

      window.parent.postMessage({ type: type, payload: payload || {}, requestId: requestId }, '*');

      setTimeout(function() {
        if (pending[requestId]) {
          delete pending[requestId];
          reject(new Error('Timeout: ' + type));
        }
      }, 10000);
    });
  }

  function onMessage(event) {
    var data = event.data;
    if (data && data.requestId && pending[data.requestId]) {
      var p = pending[data.requestId];
      delete pending[data.requestId];
      if (data.success) {
        p.resolve(data.result);
      } else {
        p.reject(new Error(data.error || 'Unknown error'));
      }
    }
  }

  window.addEventListener('message', onMessage);

  window.mittenOS = {
    window: {
      setTitle: function(title) { send('window.setTitle', { title: title }); },
      close: function() { send('window.close', {}); },
      minimize: function() { send('window.minimize', {}); }
    },
    fs: {
      readFile: function(path) { return send('fs.readFile', { path: path }).then(function(r) { return r ? r.content : null; }); },
      writeFile: function(path, content) { return send('fs.writeFile', { path: path, content: content }); },
      listDir: function(path) { return send('fs.listDir', { path: path }).then(function(r) { return r ? r.entries : []; }); }
    },
    notifications: {
      show: function(title, message, type) { send('notifications.show', { title: title, message: message, type: type || 'info' }); }
    },
    apps: {
      open: function(appId) { send('apps.open', { appId: appId }); }
    },
    ai: {
      chat: function(messages, options) { return send('ai.chat', { messages: messages, options: options }); }
    }
  };
})();
`;

export { OS_BRIDGE_CLIENT_SCRIPT };
