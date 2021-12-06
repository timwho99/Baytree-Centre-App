import { FC, useEffect, useState } from "react";
import { MenteeProfileHeader } from "../components/mentee_profile/MenteeProfileHeader";
import { Router, Route } from "react-router-dom";
import { history, Paths } from "../util/routes";
import MenteeGoals, {
  MenteeInfoProps
} from "../components/mentee_profile/MenteeGoals";
import { TabNav } from "../components/TabNav";
import { MenteeSessionList } from "../components/mentee_profile/MenteeSessionList";
import {
  getFormattedDayMonthYearString,
  getFormattedMonthDateyearString
} from "../util/date";
import { ItemProps } from "../components/SessionItem";
import { QuestionnaireList } from "../components/mentee_profile/QuestionnaireList";
import { QuestionnaireItemProps } from "../components/mentee_profile/QuestionnaireItem";
import { TabNavItemProps } from "../components/TabNav";
import { buildPath } from "../components/Link";
import { useParams } from "react-router";
import { Endpoints, RequestType, sendRequest } from "../util/request";

export const sessionHistoryList: ItemProps[] = [
  {
    value: getFormattedMonthDateyearString(new Date()),
    clockInTime: (() => {
      const date = new Date();
      date.setHours(21, 0);
      return date;
    })(),
    clockOutTime: (() => {
      const date = new Date();
      date.setHours(24, 0);
      return date;
    })(),
    content:
      "CMPT373: Survey of modern software development methodology. Several software development process models will be examined, as will the general principles behind such models. Provides experience with different programming paradigms and their advantages and disadvantages during software development."
  },
  {
    value: getFormattedMonthDateyearString(new Date()),
    clockInTime: (() => {
      const date = new Date();
      date.setHours(21, 0);
      return date;
    })(),
    clockOutTime: (() => {
      const date = new Date();
      date.setHours(22, 0);
      return date;
    })(),
    content:
      "CMPT 363: Topics include: goals and principles of UI design (systems engineering and human factors), historical perspective, current paradigms (widget-based, mental model, graphic design, ergonomics, metaphor, constructivist/iterative approach, and visual languages) and their evaluation, existing tools and packages (dialogue models, event-based systems, prototyping), future paradigms, and the social impact of UI."
  },
  {
    value: getFormattedMonthDateyearString(new Date()),
    clockInTime: (() => {
      const date = new Date();
      date.setHours(12, 0);
      return date;
    })(),
    clockOutTime: (() => {
      const date = new Date();
      date.setHours(22, 0);
      return date;
    })(),
    content:
      "CMPT 300: This course aims to give the student an understanding of what a modern operating system is, and the services it provides. It also discusses some basic issues in operating systems and provides solutions. Topics include multiprogramming, process management, memory management, and file systems."
  }
];

export const questionnaireList: QuestionnaireItemProps[] = [
  {
    month: "September",
    year: "2021"
  },
  {
    month: "August",
    year: "2021"
  },
  {
    month: "July",
    year: "2021"
  }
];

const MenteeProfile: FC<{}> = () => {
  const [menteeName, setMenteeName] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [birthday, setBirthday] = useState<string>("");

  const { association_id } = useParams<{ association_id: string }>();
  const getNavPath = (path: string): string =>
    buildPath(path, [{ name: "association_id", value: association_id }]);

  const routes: TabNavItemProps[] = [
    {
      label: "Goals",
      to: getNavPath(Paths.menteeProfileGoals)
    },
    {
      label: "Sessions",
      to: getNavPath(Paths.menteeProfileSessions)
    },
    {
      label: "Questionnaires",
      to: getNavPath(Paths.menteeProfileQuestionnaires)
    }
  ];

  useEffect(() => {
    sendRequest(RequestType.GET, { endpoint: Endpoints.myMentees })
      .then(({ data: { mentees } }) => {
        const mentee = mentees.find(
          (mentee: { association_id: string }) =>
            mentee.association_id === association_id
        );
        const startDate: Date = new Date(mentee["start_date"].substring(0, 19));
        const birthday: Date = new Date(mentee["birthday"].substring(0, 15));
        setMenteeName(mentee["mentee_name"]);
        setStartDate(getFormattedDayMonthYearString(startDate));
        setBirthday(getFormattedDayMonthYearString(birthday));
      })
      .catch();
  }, []);

  return (
    <main className="mentee-profile">
      <div className="container">
        <MenteeProfileHeader
          menteeName={menteeName}
          startDate={startDate}
          birthday={birthday}
        />

        <TabNav routes={routes} />

        <Router history={history}>
          <Route path={getNavPath(Paths.menteeProfileGoals)}>
            <MenteeGoals
              menteeName={menteeName}
              startDate={startDate}
              birthday={birthday}
            />
          </Route>
          <Route path={getNavPath(Paths.menteeProfileSessions)}>
            <MenteeSessionList sessions={sessionHistoryList} />
          </Route>
          <Route path={getNavPath(Paths.menteeProfileQuestionnaires)}>
            <QuestionnaireList questionnaires={questionnaireList} />
          </Route>
        </Router>
      </div>
    </main>
  );
};

export default MenteeProfile;
