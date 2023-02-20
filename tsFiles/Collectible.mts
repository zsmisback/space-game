class Collectible {

    public id:number;
    public x:number; 
    public y:number;
    public value:number;
    public width:number;
    public height:number;
    public destroyedBy?: string;

    constructor({x = 30, y = 30, width = 15, height = 15, value = 1, id = 2}) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.value = value;
      this.id = id;
    }
  
    public draw(context:CanvasRenderingContext2D, imgObj: HTMLImageElement): void{
      context.drawImage(imgObj, this.x, this.y, this.width, this.height)
    }
  
  }
  
  export default Collectible;
  