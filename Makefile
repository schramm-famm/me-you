APP_NAME=me-you
REGISTRY?=343660461351.dkr.ecr.us-east-2.amazonaws.com
TAG?=latest
MEYOU_BACKEND?=localhost:80
HELP_FUNC = \
    %help; \
    while(<>) { \
        if(/^([a-z0-9_-]+):.*\#\#(?:@(\w+))?\s(.*)$$/) { \
            push(@{$$help{$$2 // 'targets'}}, [$$1, $$3]); \
        } \
    }; \
    print "usage: make [target]\n\n"; \
    for ( sort keys %help ) { \
        print "$$_:\n"; \
        printf("  %-20s %s\n", $$_->[0], $$_->[1]) for @{$$help{$$_}}; \
        print "\n"; \
    }

.PHONY: help
help: 				## show options and their descriptions
	@perl -e '$(HELP_FUNC)' $(MAKEFILE_LIST)

all:  				## clean the working environment, then build and run the docker image
all: clean docker-build docker-run

docker-build:
	docker build -t $(REGISTRY)/$(APP_NAME):$(TAG) .

docker-run:		## start the docker image in a container
	docker run -d -p 80:80 -e MEYOU_BACKEND=$(MEYOU_BACKEND) --name $(APP_NAME) $(REGISTRY)/$(APP_NAME):$(TAG)

docker-push:	## push the docker image to a registry
	docker push $(REGISTRY)/$(APP_NAME):$(TAG)

.PHONY: clean
clean: 				## remove tmp/, stop and remove app container, old docker images
	rm -rf tmp
ifneq ("$(shell docker container list -a | grep $(APP_NAME))", "")
	docker rm -f $(APP_NAME)
endif
	docker system prune
ifneq ("$(shell docker images | grep $(APP_NAME) | awk '{ print $3; }')", "")
	docker images | grep $(APP_NAME) | awk '{ print $3; }' | xargs -I {} docker rmi -f {}
endif
