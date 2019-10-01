---
layout: post
title: "Injecting Service Returns Null In Grails"
date:   2019-10-01 19:23:00 +0300
categories: [SoftwareDev]
tags: [Back-end, Grails] 
intro: When I tried to inject service in my custom Gorm event listener in Grails, that service returned null. Here is how I fixed it.
---

## Environment
- Grails 4
- Spring
- Gorm Graphql

## Error
I wanted to inform front-end through websocket after GORM made any updates to the database. So I extended AbstractPersistenceEventListener and injected a socket service in it :

```groovy
class CustomPersistenceEventListenerImpl extends AbstractPersistenceEventListener {

    @Autowired
    SocketService socketService

    protected CustomPersistenceEventListenerImpl(Datastore datastore,SocketService service) {
        super(datastore)
        this.socketService = service
    }

    @Override
    protected void onPersistenceEvent(AbstractPersistenceEvent event) {
        if (event.source != this.datastore) {
            log.trace("Event received for other datastore. Ignoring event")
            return
        }

        switch (event.eventType) {
            case EventType.PostInsert:
                break
            case EventType.PostDelete:
                break
            case EventType.PostUpdate:
                break
        }

        socketService.inform()
    }

    @Override
    boolean supportsEventType(Class<? extends ApplicationEvent> eventType) {
        return eventType.isAssignableFrom(PostInsertEvent) ||
                eventType.isAssignableFrom(PostDeleteEvent) ||
                eventType.isAssignableFrom(PostUpdateEvent)
    }
}
``` 

Then initialize this listener in Bootstrap.groovy:

```groovy
class BootStrap {
   def init = { servletContext ->

      def ctx = servletContext.getAttribute(GrailsApplicationAttributes.APPLICATION_CONTEXT)
        ctx.getBeansOfType(Datastore).values().each { Datastore d ->
            ctx.addApplicationListener new CustomPersistenceEventListenerImpl(d, socketService)
        }

   }
}
```

But my socket did not send anything. Then I found it was because socket service returns null in this listener.

## Reason
Bootstrap runs before service is initialized.

## Solution
Initialize socket in Bootstrap.groovy before this listener:

```groovy
class BootStrap {

    def socketService

    def init = { servletContext ->
    ...
    }
}
```

## why don't I use GORM event handler in domains?
1. I have to enable autowire in domains:

```groovy
static mapping = {
       autowire true
   }
```
2. when I call domain.properties, it also returns the injected service.

If you don't mind these, you can continue reading [GORM: Events and Auto Timestamping](http://gorm.grails.org/6.0.x/hibernate/manual/#eventsAutoTimestamping)

In this method, you don't need to initialize service in Bootstrap.groovy