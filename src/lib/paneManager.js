import { HistogramSeries, LineSeries } from "lightweight-charts";

class PaneManager{
    constructor(chart){
        this.chart = chart;
        this.panes = [] // list of -> {id , paneIndex , seriesList} tracks every active indicator
        this.nextPaneIndex = 1; // 0 is always the candles , sub-planes start at 1
    }

    _allocatePane(){
        // hands out the next free pane number and increase the counter
        return this.nextPaneIndex++;
    }

    // add an indicator - returns array of created series
    add(id , seriesConfigs , onMainPane=false){
        if(this.panes.find(p=>p.id===id)){
            console.warn(`Indicator ${id} already exist`);
        }

        const paneIndex = onMainPane ? 0 : this._allocatePane();
        const seriesList = seriesConfigs.map(({type , options}) => {
            switch(type){
                case 'line': return this.chart.addSeries(LineSeries , options , paneIndex);
                case 'histogram': return this.chart.addSeries(HistogramSeries , options , paneIndex);
            }
        });
        this.panes.push({id , paneIndex , seriesList});
        return seriesList;
    }

    //remove one indicator and reclaim its pane
    remove(id){
        const idx = this.panes.findIndex(p=>p.id === id);
        if(idx === -1)return;
        
        //Remove all the series belonging to this indicator
        this.panes[idx].seriesList.forEach(s => {
            try {this.chart.removeSeries(s);} catch(e) {console.error(e);}
        });

        this.panes.splice(idx , 1);

        // Recalculate nextPaneIndex if you had RSI(1), OBV(2), STOCH(3) and 
        // removed OBV, nextPaneIndex becomes 4 (max of remaining is 3, plus 1).
        // The next indicator added gets pane 4. Note that pane 2 is now a gap — lightweight-charts 
        // handles that automatically by collapsing it visually.
    }

    // remove all indicators (but keep candles)
    removeAll(){
        [...this.panes].forEach(p=>this.remove(p.id));
        this.nextPaneIndex = 1;
    }

    // Get series list of an indicator by id
    get(id){
        return this.panes.find(p=> p.id === id)?.seriesList??null;
    }

    has(id){
        return this.panes.find(p=>p.id === id)?true:false;
    }
};