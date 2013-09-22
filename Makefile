REPORTER = spec

test:
	./node_modules/.bin/mocha \
	--reporter $(REPORTER) 

test-watch:
	./node_modules/.bin/mocha \
	--reporter $(REPORTER) \
	--watch

.PHONY: test