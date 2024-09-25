

function onSyscall(context) {
    console.log('Match! pc=' + context.pc +
       ' rax=' + context.rax.toInt32() + 'rdi=' + context.rdi.toInt32());
}

export function stalk() {
    Stalker.follow(Process.main, {
        events: {
        call: false,
        ret: false,
        exec: true,
        block: false,
        compile: false
        },
        onReceive(events) {
            console.log(events)
        },
        _transform(iterator){
            let instruction = iterator.next()
            do{
                if(instruction.mnemonic == "syscall"){
                    iterator.putCmpRegI32('rax', 0);
                    iterator.putJccShortLabel('jne', 'nope', 'no-hint');
                    iterator.putCallout(onSyscall);
                    iterator.putLabel('nope');
                }
                iterator.keep()
            } while ((instruction = iterator.next()) !== null)
            Stalker.flush()
            Stalker.unfollow(Process.main)
        },

    })
}