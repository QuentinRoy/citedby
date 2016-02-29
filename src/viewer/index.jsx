import ReactDOM from 'react-dom';
import RefTable from './components/ref-table.jsx';
import React from 'react';
import common from "../common.js";

function showErr(err){
    if(err.message){
        console.error(err.stack, err.message);
    } else {
        console.error(err);
    }
}

class Main extends React.Component {
    constructor(props){
        super(props);
        this.state = { references: [] };

        fetch(props.dataAddr)
            .then(res => res.json())
            .then(references => this.setState({ references }))
            .catch(showErr);
    }

    render(){
        if(this.state.references.length){
            return <div id="main"><RefTable references={this.state.references} /></div>
        } else {
            return <div id="main" className="hidden" />
        }
    }
}

ReactDOM.render(<Main dataAddr={common.scrapingLocation} />, document.getElementById('content'));
