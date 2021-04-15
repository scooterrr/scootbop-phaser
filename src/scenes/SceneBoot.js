export class SceneBoot extends Phaser.Scene
{

	function preload() {

		// Load images
	    this.load.image('logo', 'zenvalogo.png');
	    for (var i = 0; i < 500; i++) {
	        this.load.image('logo'+i, 'zenvalogo.png');
	    }

	    //
		this.load.on('progress', function (value) {
		    console.log(value);
		});
		            
		this.load.on('fileprogress', function (file) {
		    console.log(file.src);
		});
		 
		this.load.on('complete', function () {
		    console.log('complete');
		});

	}
	 
	function create() {
	    var logo = this.add.image(400, 300, 'logo');
	}

}
export default SceneBoot