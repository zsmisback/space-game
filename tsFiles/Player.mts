import { canvasDetails } from './canvasData.mjs';
import Collectible from './Collectible.mjs';

interface PlayerConstructor{
  id:string;
  x:number;
  y:number;
  score:number;
  isMain:boolean;
}

type Entity = {
  id: String,
  keys: Record<string, boolean>,
  inputSequence: number,
  deltaTime: number
}

class Player {
    public id: string;
    public x: number; 
    public y: number;
    public score: number;
    public isMain: boolean;
    public speedX = 0;
    public speedY = 0;
    public width = 40;
    public height = 30;
    public keys: Record<string, boolean> = {};
    public inputs: Array<Entity> = [];
    public positionBuffer: Array<Array<number>> = [];
    public inputSequenceNumber: number = 0;
    private lastTimeStamp: number = -1;
    private deltaTime: number = 0;
    
    constructor({id, x, y, score = 0, isMain = false}: PlayerConstructor){
        this.id = id;
        this.x = x;
        this.y = y;
        this.score = score;
        this.isMain = isMain;
    }

    public drawPlayer(context: CanvasRenderingContext2D, collectible: Collectible, allPlayers: Player[], ufo: Record<string, HTMLImageElement>, socket: any, render_timestamp: number): void {
      //New changes - changed the method name from "movePlayer" to "calculateMainPlayerDirection" and added the socket parameter  
      
      /* Old Change
      this.x += this.speedX;
      this.y += this.speedY;
      */
     //New Changes - Added an "applyInputDirection" method
        if(this.isMain){
            this.calculateMainPlayerDirection(socket);
            this.applyInputDirection();
            context.fillStyle = 'black';
            context.font = `13px 'Press Start 2P'`;
            context.fillText(this.calculateRank(allPlayers), 560, 32.5);
            context.drawImage(ufo.mainPlayerUfo, this.x, this.y, this.width, this.height);
        }else{
            this.interpolateOtherPlayers(render_timestamp);
            context.drawImage(ufo.otherPlayerUfo, this.x, this.y, this.width, this.height);
        }

        if(this.collision(collectible)){
            collectible.destroyedBy = this.id;
        }
    }

    public movDirection(dir:string): void{
        this.keys[dir] = true;
      }
    
    public stopDirection(dir:string): void{
        this.keys[dir] = false;
      }
    
      //Check as to whether the player has decided to move
    private calculateMainPlayerDirection(socket: any): void {
        this.speedX = 0;
        this.speedY = 0;
        //New Changes
        let currTimeStamp: number = +new Date();
        let lastTimeStamp: number = (this.lastTimeStamp == -1) ? currTimeStamp : this.lastTimeStamp;
        let deltaTime: number = (currTimeStamp - lastTimeStamp) / 1000.0;
        this.lastTimeStamp = currTimeStamp;
        this.deltaTime = deltaTime;
        let calculatedSpeed = canvasDetails.canvasSpeed * deltaTime;
        
        if(!this.keys["ArrowUp"] && !this.keys["ArrowDown"] && !this.keys["ArrowLeft"] && !this.keys["ArrowRight"] && !this.keys["w"] && !this.keys["s"] && !this.keys["a"] && !this.keys["d"]) return;
        /////
        if(this.keys["ArrowUp"] || this.keys["w"]) this.y - calculatedSpeed <= canvasDetails.fieldMinY ? this.speedY = 0 : this.speedY -= calculatedSpeed;
        if(this.keys["ArrowDown"] || this.keys["s"]) this.y + calculatedSpeed >= canvasDetails.fieldMaxY ? this.speedY = 0 : this.speedY += calculatedSpeed;
        if(this.keys["ArrowLeft"] || this.keys["a"]) this.x - calculatedSpeed <= canvasDetails.fieldMinX ? this.speedX = 0 : this.speedX -= calculatedSpeed;
        if(this.keys["ArrowRight"] || this.keys["d"]) this.x + calculatedSpeed >= canvasDetails.fieldMaxX ? this.speedX = 0 : this.speedX += calculatedSpeed;
        //New Changes
        this.inputSequenceNumber += 1;
        let entity: Entity = {id: this.id, keys: this.keys, inputSequence: this.inputSequenceNumber, deltaTime: this.deltaTime};
        this.inputs.push(entity);
        socket.emit("sendMessage", entity);
        /////////////
      }

    private interpolateOtherPlayers(render_timestamp: number): void{
      // Find the two authoritative positions surrounding the rendering timestamp.
      let buffer = this.inputs;

      // Drop older positions.
      while (this.positionBuffer.length >= 2 && this.positionBuffer[1][2] <= render_timestamp) {
        this.positionBuffer.shift();
      }

      // Interpolate between the two surrounding authoritative positions.
      if (this.positionBuffer.length >= 2 && this.positionBuffer[0][2] <= render_timestamp && render_timestamp <= this.positionBuffer[1][2]) {
        let x0 = this.positionBuffer[0][0];
        let x1 = this.positionBuffer[1][0];
        let y0 = this.positionBuffer[0][1];
        let y1 = this.positionBuffer[1][1];
        let t0 = this.positionBuffer[0][2];
        let t1 = this.positionBuffer[1][2];
        this.x = x0 + (x1 - x0) * (render_timestamp - t0) / (t1 - t0);
        this.y = y0 + (y1 - y0) * (render_timestamp - t0) / (t1 - t0);
      }
    }
    
    //Calculate the new position of the player
    private applyInputDirection(): void{
      this.x += this.speedX;
      this.y += this.speedY;
    }
    
    public collision(item: Collectible): boolean {
        if(this.x < item.x + item.width && this.x + this.width > item.x
          && this.y < item.y + item.height && this.y + this.height > item.y){
            return true;
          }
          return false;
      }
    
    public calculateRank(arr:Player[]): string {
        const sortByScore = arr.sort((a, b) => b.score - a.score);
        const mainPlayerRank = (this.score == 0) ? arr.length : sortByScore.findIndex(player => player.id == this.id) + 1;
        return `Rank: ${mainPlayerRank} / ${arr.length}`;
      }


}

export default Player;