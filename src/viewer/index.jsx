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
    constructor(){
        super();
        this.state = { references: [] };
        // Fetch the data.
        fetch(this.props.dataAddr)
            .then(res => res.json())
            .then(references => this.setState({ references }))
            .catch(showErr)
    }
    render(){
        return <RefTable references={this.state.references} />
    }
}

ReactDOM.render(<Main dataAddr={common.scrappingLocation} />, document.getElementById('content'));
