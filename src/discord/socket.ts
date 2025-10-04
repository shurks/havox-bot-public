import { createServer } from "http";
import { Server } from "socket.io";

export default class Socket {
    public static main = async () => {
        return new Promise<void>(async(res) => {
            const httpServer = createServer()
            const io = new Server(httpServer, {
                cors: {
                    origin: '*'
                }
            })
            io.on('connection', socket => {
                console.log('client connected', socket.id)
                socket.on('message', (data) => {
                    socket.emit('reply', data)
                })
                socket.emit('message', 'https://google.com')
            })
            httpServer.listen(3000, () => {
                console.log('Socket.IO server running on port 3000')
            })
        })
    }
}