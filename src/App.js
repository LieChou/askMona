import React, { Component } from 'react';
import styled, { ThemeProvider } from "styled-components"
import theme from "./theme/";
import "./theme/baseline.css";
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Loading from './Loading';

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 32px;
  padding-right: 32px;
  max-width: 1280px;
  margin: auto;
`

const Box = styled.div`
  display: flex;
  flex: 1;
  border-radius: 5px;
  background: white;
  height: 100vh
  flex-direction: column;
  white-space: pre-line;
  padding: 5px;
`

const Div = styled.div`
  display:flex;
  flex-direction:column;
  width:100%;
  height: 100vh;
  padding: 10%;
  margin: auto
`

class App extends Component {

  constructor(props) {

    super(props)

    this.state = {
      data: {},
      startDate: null,
      endDate: null,
      minUpdated: null,
      maxUpdated: null,
      startDatePicker: null,
      endDatePicker: null,
      loaded: false
    }
  }
  //api call to get the list of last 6000 issues, opened and closed
  getData = async () => {
    let data = []
    let futures = []
    for (let i = 0; i < 30; i++) {
      var f = axios.get(`https://api.github.com/repos/microsoft/vscode/issues?state=all&per_page=100&page=${i}&sort=updated`)
        .then(response => response.data)
        .then(infos => {
          const issues = infos.map(i => ({
            updated: i.updated_at,
            opened: i.created_at,
            closed: i.closed_at
          }))
          data.push(issues)
          //store data in localStorage
          localStorage.setItem("data", JSON.stringify(data));
        })
        .catch(err => {
          console.log(err);
        })
      futures.push(f)
    }
    for (let i = 0; i < 30; i++) {
      await futures[i]
    }
    this.getChartData();
  }

  //api call to get current number of issues
  getCurrentNumberOfIssues = (filteredIssues) => {
    axios.get('https://api.github.com/repos/microsoft/vscode')
      .then(response => response.data.open_issues_count)
      .then(
        openIssues => {
          const currentIssues = openIssues;
          this.calculateChartData(currentIssues, filteredIssues);
        })
      .catch(err => {
        console.log(err);
      })
  }

  //first unction to get data needed for chart
  getChartData = () => {

    //retreiveData from local Storage 
    var storedData = JSON.parse(localStorage.getItem("data"));

    //flatten array of arrays
    var mergedArrays = [].concat(...storedData);

    //get the min updated value in data
    let minUpdated = new Date().toISOString()
    for (let i = 0; i < mergedArrays.length; i++) {
      if (mergedArrays[i].updated < minUpdated) {
        minUpdated = mergedArrays[i].updated;
        this.setState({
          minUpdated: minUpdated

        })
      }
    }
    if (this.state.startDate === null) {
      this.setState({
        startDate: minUpdated,
        startDatePicker: new Date(minUpdated)
      })
    }

    //get the max updated value in data
    let maxUpdated = new Date(0).toISOString()
    for (let i = 0; i < mergedArrays.length; i++) {
      if (mergedArrays[i].updated > maxUpdated) {
        maxUpdated = mergedArrays[i].updated;
        this.setState({
          maxUpdated: maxUpdated
        })
      }
    }
    if (this.state.endDate === null) {
      this.setState({
        endDate: maxUpdated,
        endDatePicker: new Date(maxUpdated)
      })
    }

    //create one array with opened and closed issues but no null value anymore
    let allIssues = [];
    for (let i = 0; i < mergedArrays.length; i++) {
      allIssues.push({ type: 'open', date: mergedArrays[i].opened });
      if (mergedArrays[i].closed && mergedArrays[i].closed !== null) {
        allIssues.push({ type: 'closed', date: mergedArrays[i].closed })
      }
    }

    //sort issues to make array chronological 
    let sortedAllIssues = allIssues.sort((a, b) => (
      a.date < b.date ? 1 : -1
    ))

    //filter updated issues to print only above min update value && date range selector filter for date picker 
    const filteredIssues = sortedAllIssues.filter(issue => {
      let res = issue.date > minUpdated;
      if (this.state.startDate !== null) {
        res = res && issue.date >= this.state.startDate
      }
      if (this.state.endDate !== null) {
        res = res && issue.date <= this.state.endDate
      }
      return res;
    });

    //get the current number of opened issues before using it in chart
    this.getCurrentNumberOfIssues(filteredIssues)
  }


  //second function to finalize chart data calculation before rendering it in chart
  calculateChartData = (currentIssues, filteredIssues) => {

    //function to calculate dynamically the number of opened and closed issues in the past
    let allData = [];
    for (let i = 0; i < filteredIssues.length; i++) {
      let x = filteredIssues[i].date;
      let y;
      if (filteredIssues[i].type === "open") {
        y = currentIssues - 1;
      } else {
        y = currentIssues + 1;
      }
      allData.push({ x, y });
      currentIssues = y
    }

    this.setState({
      data: {
        datasets: [
          {
            label: "opened issues",
            data: allData,
            borderColor: "rgba(44, 46, 123, 0.75)",
            backgroundColor: "rgba(44, 46, 123, 0.75)",
            fill: 'none',
            pointRadius: 1.5,
            borderWidth: 1,
            lineTension: 0
          }
        ]
      },
      loaded: true
    })
  }


  async componentDidMount() {
    if (localStorage.getItem('data') === null) {
      await this.getData();
    } else {
      this.getChartData()
    }

  }

  handleStartChange = (startDate) => {
    let start = startDate.toISOString();
    this.setState({
      startDate: start,
      startDatePicker: startDate
    });
    this.getChartData();
  }

  handleEndChange = (endDate) => {
    let end = endDate.toISOString();
    this.setState({
      endDate: end,
      endDatePicker: endDate
    });
    this.getChartData();
  }


  render() {
    if (this.state.loaded === false) {
      return (
        <div>
          <Loading />
        </div>
      )
    }
    return (
      <ThemeProvider theme={theme}>
        <Container>
          <Box>
            <h3 style={{ display: 'flex', margin: 'auto', paddingTop: '25px' }}>Microsoft/vscode github issues chart</h3>
            <div style={{ dsiplay: 'flex', margin: 'auto' }}>
              <p>Choisissez une date pour zoomer sur le graphique: </p>
              <div style={{ dsiplay: 'flex', margin: 'auto', width: '50%' }}>
                <DatePicker
                  selected={this.state.startDatePicker}
                  onChange={this.handleStartChange}
                  startDate={this.state.startDatePicker}
                  placeholderText="date début"
                  withPortal
                  minDate={new Date(this.state.minUpdated)}
                  maxDate={this.state.endDatePicker}
                  dateFormat='yyyy-MM-dd'
                />
                <DatePicker
                  selected={this.state.endDatePicker}
                  onChange={this.handleEndChange}
                  endDate={this.state.endDatePicker}
                  placeholderText="date fin"
                  withPortal
                  minDate={this.state.startDatePicker}
                  maxDate={new Date(this.state.maxUpdated)}
                  dateFormat='yyyy-MM-dd'
                />
              </div>
            </div>
            <Div>
              <Line
                options={{
                  scales: {
                    xAxes: [{
                      title: "time",
                      type: "time",
                      time: {
                        unit: "week",
                      }
                    }
                    ]
                  }
                }}
                data={this.state.data}
              />
            </Div>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }
}

export default App;


