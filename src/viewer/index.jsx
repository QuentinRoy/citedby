import ReactDOM from 'react-dom';
import RefTable from './components/ref-table.jsx';
import React from 'react';
import common from "../common.js";

const scrappingLocation = common.scrappingLocation;

function showErr(err){
    if(err.message){
        console.error(err.stack, err.message);
    } else {
        console.error(err);
    }
}

class Main extends React.Component {
    constructor(){
        super();
        this.state = { references: [] };
        // Fetch the data.
        fetch(scrappingLocation).then(res => res.json()).then(
            references => this.setState({ references })
        ).catch(showErr)
    }
    render(){
        return <RefTable references={ this.state.references }/>
    }
}

ReactDOM.render(<Main dataAddr="data.json" />, document.getElementById('content'));
