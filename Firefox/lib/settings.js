exports.include = ["http://forums.frontier.co.uk/*","https://forums.frontier.co.uk/*"];
exports.contentScriptWhen = "start";
exports.contentScriptFile = ["self.data.url('BabelExt.js')","self.data.url('jquery.min.js')","self.data.url('jquery-observe.js')","self.data.url('handlers.js')","self.data.url('dispatcher.js')"];
