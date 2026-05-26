try {
	module.exports = require("bindings")("ccore");
} catch (err) {
	console.error("Ccore is not set up, using JavaScript instead");
	module.exports = {};
}
