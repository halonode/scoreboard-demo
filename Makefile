install: #node_modules
	rm -rf node_modules && npm install

server:
	node ./demo/app.js

doc:
	npm run jsdoc && open ./doc/index.html

.PHONY: doc
.PHONY: server