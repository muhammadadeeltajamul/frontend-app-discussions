import React, { useContext, useEffect } from 'react';

import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import {
  Redirect, Route, Switch, useHistory, useLocation, useRouteMatch,
} from 'react-router';

import { AppContext } from '@edx/frontend-platform/react';
import { breakpoints, useWindowSize } from '@edx/paragon';

import { PostActionsBar } from '../../components';
import { ALL_ROUTES, DiscussionProvider, Routes } from '../../data/constants';
import { fetchCourseBlocks } from '../../data/thunks';
import { CommentsView } from '../comments';
import { DiscussionContext } from '../common/context';
import { selectDiscussionProvider } from '../data/selectors';
import { fetchCourseConfig } from '../data/thunks';
import { BreadcrumbMenu, LegacyBreadcrumbMenu, NavigationBar } from '../navigation';
import { PostEditor, PostsView } from '../posts';
import { clearRedirect } from '../posts/data';
import { TopicsView } from '../topics';
import { fetchCourseTopics } from '../topics/data/thunks';
import { discussionsPath } from '../utils';

export default function DiscussionsHome() {
  const dispatch = useDispatch();
  const history = useHistory();
  const { authenticatedUser } = useContext(AppContext);
  const location = useLocation();
  const postEditorVisible = useSelector(
    (state) => state.threads.postEditorVisible,
  );
  const {
    params: { page },
  } = useRouteMatch(`${Routes.COMMENTS.PAGE}?`);
  const { params } = useRouteMatch(ALL_ROUTES);
  const {
    courseId,
    postId,
    topicId,
    category,
  } = params;
  const inContext = new URLSearchParams(location.search).get('inContext') !== null;

  // Display the content area if we are currently viewing/editing a post or creating one.
  const displayContentArea = postId || postEditorVisible;
  // If the window is larger than a particular size, always show the sidebar for navigating between posts/topics.
  // However, for smaller screens or embeds, only show the sidebar if the content area isn't displayed.
  const displaySidebar = useWindowSize().width >= breakpoints.large.minWidth || !displayContentArea;
  const redirectToThread = useSelector(
    (state) => state.threads.redirectToThread,
  );
  const provider = useSelector(selectDiscussionProvider);
  useEffect(() => {
    async function fetchBaseData() {
      await dispatch(fetchCourseConfig(courseId));
      await dispatch(fetchCourseTopics(courseId));
      await dispatch(fetchCourseBlocks(courseId, authenticatedUser.username));
    }

    fetchBaseData();
  }, [courseId]);
  useEffect(() => {
    // After posting a new thread we'd like to redirect users to it, the topic and post id are temporarily
    // stored in redirectToThread
    if (redirectToThread) {
      dispatch(clearRedirect());
      const newLocation = discussionsPath(Routes.COMMENTS.PAGES['my-posts'], {
        courseId,
        postId: redirectToThread.threadId,
      })(location);
      history.push(newLocation);
    }
  }, [redirectToThread]);

  return (
    <DiscussionContext.Provider value={{
      page,
      courseId,
      postId,
      topicId,
      inContext,
      category,
    }}
    >
      <main className="container-fluid d-flex flex-column p-0">
        <div className="d-flex flex-row justify-content-between shadow navbar">
          {!inContext && (
            <Route path={Routes.DISCUSSIONS.PATH} component={NavigationBar} />
          )}
          <PostActionsBar inContext={inContext} />
        </div>
        <Route
          path={[Routes.POSTS.PATH, Routes.TOPICS.CATEGORY]}
          component={provider === DiscussionProvider.LEGACY ? LegacyBreadcrumbMenu : BreadcrumbMenu}
        />
        <div className="d-flex flex-row">
          <div
            className={classNames('flex-column w-25 w-xs-100 w-lg-25', {
              'd-none': !displaySidebar,
              'd-flex': displaySidebar,
            })}
            style={{ minWidth: '30rem' }}
          >
            <Switch>
              <Route path={Routes.POSTS.MY_POSTS}>
                <PostsView showOwnPosts />
              </Route>
              <Route
                path={[Routes.POSTS.PATH, Routes.POSTS.ALL_POSTS, Routes.TOPICS.CATEGORY]}
                component={PostsView}
              />
              <Route path={Routes.TOPICS.PATH} component={TopicsView} />
              <Redirect
                from={Routes.DISCUSSIONS.PATH}
                to={{
                  ...location,
                  pathname: Routes.TOPICS.ALL,
                }}
              />
            </Switch>
          </div>
          <div
            className={classNames(
              'bg-light-300 flex-column w-75 w-xs-100 w-xl-75 align-items-center',
              {
                'd-flex': displayContentArea,
                'd-none': !displayContentArea,
              },
            )}
          >
            <div className="mw-xl d-flex flex-column">
              {postEditorVisible ? (
                <Route path={Routes.POSTS.NEW_POST}>
                  <PostEditor />
                </Route>
              ) : (
                <Switch>
                  <Route path={Routes.POSTS.EDIT_POST}>
                    <PostEditor editExisting />
                  </Route>
                  <Route path={Routes.COMMENTS.PATH}>
                    <CommentsView />
                  </Route>
                </Switch>
              )}
            </div>
          </div>
        </div>
      </main>
    </DiscussionContext.Provider>
  );
}
