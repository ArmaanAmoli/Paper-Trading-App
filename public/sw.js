self.addEventListener('push' , event=>{
    const data = event.data ? event.data.json():{};

    const title = data.title;

    const options={
        body:data.options.body,
        icon:data.options.icon,

    };

    event.waitUntil(
        self.registration.showNotification(title , options)
    );

});