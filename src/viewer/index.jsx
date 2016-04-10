import ReactDOM from 'react-dom';
import RefTable from './components/ref-table.jsx';
import React from 'react';
import common from "../common.js";

class Main extends React.Component {
    static get defaultProps(){
        return { references: [] };
    }
    render(){
        const className = this.props.references.length > 0 ? null : "hidden";
        return <div id="main" className={ className }><RefTable {...this.props} /></div>
    }
}

const content = document.getElementById('content');
ReactDOM.render(<Main />, content);
fetch(common.scrapingLocation)
    .then(res => res.json())
    .then(references => ReactDOM.render(<Main references={ references } />, content))
    .catch((err) => {
        if(err.stack){
            console.error(err, err.stack);
        } else {
            console.error(err);
        }
    });
