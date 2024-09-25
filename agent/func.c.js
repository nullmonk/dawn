// Auto-generated from 'agent/func.c'. DO NOT MODIFY
const code = `
// Read a buffer until a newline is reached
int readline(char *buf, int maxlen) {
    int i = 0;
    for (; i < maxlen; ++i) {
        if (buf[i] == '\n') {
            return i;
        }
    }
    return i;
}`;

export default code;
